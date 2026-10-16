/**
 * Company SSO rules + ID-token verification, against a real migrated database.
 * Tokens are signed with a local RSA key served through a stub JWKS fetcher.
 *
 *   TEST_DATABASE_URL=postgresql://... bun test ./src/modules/sso/sso.service.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import crypto from "node:crypto";

const url = process.env.TEST_DATABASE_URL;
process.env.DATABASE_URL = url ?? "postgresql://unused";
process.env.GOOGLE_CLIENT_ID = "google-client";
process.env.MICROSOFT_CLIENT_ID = "microsoft-client";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-123456789";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-123456789";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...(publicKey.export({ format: "jwk" }) as object), kid: "test-key", alg: "RS256", use: "sig" };

function sign(claims: Record<string, unknown>, key = privateKey) {
  const encodeSegment = (segment: object) => Buffer.from(JSON.stringify(segment)).toString("base64url");
  const head = encodeSegment({ alg: "RS256", kid: "test-key", typ: "JWT" });
  const body = encodeSegment({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600, ...claims });
  const signature = crypto.sign("RSA-SHA256", Buffer.from(`${head}.${body}`), key).toString("base64url");
  return `${head}.${body}.${signature}`;
}

const google = (sub: string, email: string, extra: Record<string, unknown> = {}) => sign({
  iss: "https://accounts.google.com", aud: "google-client", nonce: "n", sub, email, email_verified: true, name: email.split("@")[0], ...extra,
});
const MS_CONSUMER = "9188040d-6c67-4c5b-b112-36a304b66dad";
const microsoft = (oid: string, email: string, tid: string, extra: Record<string, unknown> = {}) => sign({
  iss: `https://login.microsoftonline.com/${tid}/v2.0`, aud: "microsoft-client", nonce: "n", tid, oid, sub: `s-${oid}`, preferred_username: email, name: email.split("@")[0], ...extra,
});

describe.skipIf(!url)("company SSO", async () => {
  const oidc = await import("../../lib/auth/oidc.js");
  const { SsoService } = await import("./sso.service.js");
  const { AuthService } = await import("../auth/service/auth.service.js");
  const { default: prisma } = await import("../../lib/prisma.js");
  oidc.setJwksFetcher(async () => [jwk as any]);

  const verify = (provider: "google" | "microsoft", idToken: string, nonce = "n") => oidc.verifyIdToken(provider, idToken, nonce);
  const signIn = async (provider: "google" | "microsoft", idToken: string, intent?: "signin" | "company-setup", name?: string) =>
    (await SsoService.signIn(await verify(provider, idToken), intent, name)) as { user: { id: string; role: string; organization_id: string; permissions: string[] } };
  const orgOf = async (organizationId: string) => prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const fails = async (pending: Promise<unknown>) => {
    try { await pending; } catch (error: any) { return { status: error.statusCode ?? error.status, message: String(error.message) }; }
    throw new Error("expected failure");
  };

  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE organizations, auth_users, profiles, organization_sso_connections, auth_identities CASCADE`;
  });
  afterAll(async () => { await prisma.$disconnect(); });

  // ── Token verification ──
  it("rejects bad tokens", async () => {
    const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
    expect((await fails(verify("google", google("1", "a@gmail.com"), "wrong"))).message).toContain("nonce");
    expect((await fails(verify("google", sign({ iss: "https://accounts.google.com", aud: "other-app", nonce: "n", sub: "1", email: "a@x.com" })))).message).toContain("different app");
    expect((await fails(verify("google", sign({ iss: "https://accounts.google.com", aud: "google-client", nonce: "n", sub: "1", email: "a@x.com" }, other)))).message).toContain("signature");
    expect((await fails(verify("google", google("1", "a@gmail.com", { exp: Math.floor(Date.now() / 1000) - 3600 })))).message).toContain("expired");
    expect((await fails(verify("microsoft", microsoft("1", "a@x.com", "t1", { iss: "https://login.microsoftonline.com/evil/v2.0" })))).message).toContain("Microsoft");
  });

  it("reads tenant: Workspace hd / Microsoft tid; personal accounts have none", async () => {
    expect((await verify("google", google("1", "a@acme.com", { hd: "acme.com" }))).tenantKey).toBe("acme.com");
    expect((await verify("google", google("1", "a@gmail.com"))).tenantKey).toBeNull();
    expect((await verify("microsoft", microsoft("1", "a@contoso.com", "tenant-1"))).tenantKey).toBe("tenant-1");
    const personal = await verify("microsoft", microsoft("1", "a@outlook.com", MS_CONSUMER));
    expect(personal.tenantKey).toBeNull();
    expect(personal.emailVerified).toBe(true);
  });

  // ── Individuals ──
  let gmailUser = "";
  it("personal Gmail → new individual workspace as admin; same account signs back in", async () => {
    const first = await signIn("google", google("g-ann", "ann@gmail.com"));
    gmailUser = first.user.id;
    expect(first.user.role).toBe("admin");
    expect((await orgOf(first.user.organization_id)).type).toBe("individual");
    expect((await signIn("google", google("g-ann", "ann@gmail.com"))).user.id).toBe(gmailUser);
  });

  it("company setup refuses personal accounts", async () => {
    expect((await fails(signIn("google", google("g-ann", "ann@gmail.com"), "company-setup"))).status).toBe(400);
  });

  // ── Google Workspace company ──
  let acmeOrg = "";
  it("admin sets up Acme with Google Workspace; employees join with no access; outsiders don't", async () => {
    const admin = await signIn("google", google("g-alice", "alice@acme.com", { hd: "acme.com" }), "company-setup", "Acme Ltd");
    acmeOrg = admin.user.organization_id;
    expect(admin.user.role).toBe("admin");
    expect(await orgOf(acmeOrg)).toMatchObject({ name: "Acme Ltd", type: "company" });

    const bob = await signIn("google", google("g-bob", "bob@acme.com", { hd: "acme.com" }));
    expect(bob.user).toMatchObject({ organization_id: acmeOrg, role: "developer", permissions: [] });

    const eve = await signIn("google", google("g-eve", "eve@evil.com", { hd: "evil.com" }));
    expect(eve.user.organization_id).not.toBe(acmeOrg);
    expect((await orgOf(eve.user.organization_id)).type).toBe("individual");
  });

  it("a claimed tenant cannot be set up again", async () => {
    expect((await fails(signIn("google", google("g-carl", "carl@acme.com", { hd: "acme.com" }), "company-setup"))).status).toBe(409);
  });

  it("discover finds Acme by email domain, not public domains", async () => {
    expect(await SsoService.discover("someone@ACME.com")).toMatchObject({ providers: ["google"], organizationName: "Acme Ltd" });
    expect((await SsoService.discover("someone@gmail.com")).providers).toEqual([]);
  });

  // ── Microsoft company ──
  it("Microsoft tenant company: same-tenant employees join, other tenants don't", async () => {
    const admin = await signIn("microsoft", microsoft("m-dan", "dan@contoso.com", "tenant-contoso"), "company-setup", "Contoso");
    const contoso = admin.user.organization_id;
    expect((await signIn("microsoft", microsoft("m-erin", "erin@contoso.com", "tenant-contoso"))).user).toMatchObject({ organization_id: contoso, role: "developer" });
    expect((await signIn("microsoft", microsoft("m-x", "x@fabrikam.com", "tenant-fabrikam"))).user.organization_id).not.toBe(contoso);
  });

  it("unverified work email never takes over an existing account; verified personal email links", async () => {
    // Microsoft work-account email claims are admin-controlled → no linking to ann@gmail.com's account
    expect((await fails(signIn("microsoft", microsoft("m-fake", "ann@gmail.com", "tenant-rogue")))).status).toBe(409);
    // Personal Microsoft account with the same email is verified by Microsoft → links to the same user
    expect((await signIn("microsoft", microsoft("m-ann", "ann@gmail.com", MS_CONSUMER))).user.id).toBe(gmailUser);
  });

  // ── Require SSO ──
  it("require SSO: only admins who can sign in with SSO may enable it; then password login and sign-up are blocked", async () => {
    const pwAdmin = await AuthService.setupAdmin("frank@globex.com", "password123", "Frank", "Globex");
    const globex = pwAdmin.user.organization_id;
    expect((await fails(SsoService.setSsoRequired(globex, pwAdmin.user.id, true))).status).toBe(400);

    // Frank connects Globex's Google Workspace with his work account → now allowed
    const identity = await verify("google", google("g-frank", "frank@globex.com", { hd: "globex.com" }));
    const settings = await SsoService.connectToOrganization(identity, { userId: pwAdmin.user.id, organizationId: globex });
    expect(settings).toMatchObject({ organization: { type: "company" }, canRequireSso: true });
    await SsoService.setSsoRequired(globex, pwAdmin.user.id, true);

    expect((await fails(AuthService.login("frank@globex.com", "password123"))).status).toBe(403);
    expect((await fails(AuthService.register("gina@globex.com", "password123", "Gina"))).status).toBe(403);
    expect((await signIn("google", google("g-frank", "frank@globex.com", { hd: "globex.com" }))).user.id).toBe(pwAdmin.user.id);

    // Removing the last connection turns the requirement off again
    await SsoService.removeConnection(globex, pwAdmin.user.id, settings.connections[0]!.id);
    expect((await AuthService.login("frank@globex.com", "password123")).user.id).toBe(pwAdmin.user.id);
  });

  it("email sign-up creates an individual workspace with the user as admin", async () => {
    const registration = await AuthService.register("hank@example.org", "password123", "Hank");
    expect((await orgOf(registration.organization_id)).type).toBe("individual");
    expect((await AuthService.login("hank@example.org", "password123")).user.role).toBe("admin");
  });
});
