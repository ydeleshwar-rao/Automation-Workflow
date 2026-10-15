/**
 * Verifies Google / Microsoft OpenID Connect ID tokens locally: RS256 signature
 * against the provider's published keys (JWKS, cached), then issuer, audience,
 * expiry and nonce. Returns normalized claims used by the SSO service.
 */

import crypto from "node:crypto";

export type SsoProvider = "google" | "microsoft";

/** Microsoft's tenant for personal accounts (outlook.com, hotmail.com, …). */
export const MICROSOFT_CONSUMER_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad";

export type VerifiedIdentity = {
  provider: SsoProvider;
  subject: string;              // stable IdP user ID
  email: string;                // lowercased
  emailVerified: boolean;       // safe to link to an existing account by email
  name: string;
  picture: string | null;
  /** Google Workspace domain (hd) or Microsoft tenant ID (tid); null for personal accounts. */
  tenantKey: string | null;
};

type Jwk = { kid: string; kty: string; n: string; e: string; alg?: string; use?: string };
type JwtHeader = { alg: string; kid: string; typ?: string };
type Claims = Record<string, unknown>;

const PROVIDERS: Record<SsoProvider, { jwksUri: string; clientIdEnv: string }> = {
  google: {
    jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
    clientIdEnv: "GOOGLE_CLIENT_ID",
  },
  microsoft: {
    jwksUri: "https://login.microsoftonline.com/common/discovery/v2.0/keys",
    clientIdEnv: "MICROSOFT_CLIENT_ID",
  },
};

export class OidcError extends Error {}

// ── JWKS cache ─────────────────────────────────────────────────────────────

const JWKS_TTL_MS = 60 * 60 * 1000;
const jwksCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();

/** Overridable in tests. */
export let fetchJwks = async (uri: string): Promise<Jwk[]> => {
  const res = await fetch(uri);
  if (!res.ok) throw new OidcError(`Could not load signing keys (${res.status})`);
  return ((await res.json()) as { keys: Jwk[] }).keys;
};

export function setJwksFetcher(fn: typeof fetchJwks) {
  fetchJwks = fn;
  jwksCache.clear();
}

async function signingKey(uri: string, kid: string): Promise<crypto.KeyObject> {
  let cached = jwksCache.get(uri);
  let jwk = cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS ? cached.keys.find((k) => k.kid === kid) : undefined;
  if (!jwk) {
    // Unknown kid → keys may have rotated; refetch once
    cached = { keys: await fetchJwks(uri), fetchedAt: Date.now() };
    jwksCache.set(uri, cached);
    jwk = cached.keys.find((k) => k.kid === kid);
  }
  if (!jwk) throw new OidcError("Token was signed with an unknown key");
  return crypto.createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: "jwk" });
}

// ── Verification ───────────────────────────────────────────────────────────

const b64json = <T>(part: string): T => {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
  } catch {
    throw new OidcError("Malformed sign-in token");
  }
};

export async function verifyIdToken(provider: SsoProvider, idToken: string, expectedNonce: string): Promise<VerifiedIdentity> {
  const config = PROVIDERS[provider];
  const clientId = process.env[config.clientIdEnv];
  if (!clientId) throw new OidcError(`${provider === "google" ? "Google" : "Microsoft"} sign-in is not configured (${config.clientIdEnv} is missing)`);

  const parts = idToken.split(".");
  if (parts.length !== 3) throw new OidcError("Malformed sign-in token");
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

  const header = b64json<JwtHeader>(headerPart);
  if (header.alg !== "RS256") throw new OidcError("Unsupported token algorithm");

  const key = await signingKey(config.jwksUri, header.kid);
  const valid = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${headerPart}.${payloadPart}`),
    key,
    Buffer.from(signaturePart, "base64url"),
  );
  if (!valid) throw new OidcError("Invalid token signature");

  const claims = b64json<Claims>(payloadPart);
  const now = Math.floor(Date.now() / 1000);
  const skew = 120;

  if (claims.aud !== clientId) throw new OidcError("Token was issued for a different app");
  if (typeof claims.exp !== "number" || claims.exp + skew < now) throw new OidcError("Sign-in token has expired");
  if (typeof claims.iat === "number" && claims.iat - skew > now) throw new OidcError("Sign-in token is not valid yet");
  if (!expectedNonce || claims.nonce !== expectedNonce) throw new OidcError("Sign-in could not be verified (nonce mismatch)");

  return provider === "google" ? googleIdentity(claims) : microsoftIdentity(claims);
}

function googleIdentity(c: Claims): VerifiedIdentity {
  if (c.iss !== "https://accounts.google.com" && c.iss !== "accounts.google.com") {
    throw new OidcError("Token was not issued by Google");
  }
  const email = String(c.email ?? "").toLowerCase();
  if (!email) throw new OidcError("Google account did not return an email address");

  return {
    provider: "google",
    subject: String(c.sub),
    email,
    emailVerified: c.email_verified === true || c.email_verified === "true",
    name: String(c.name ?? ""),
    picture: typeof c.picture === "string" ? c.picture : null,
    // "hd" is only present for Google Workspace accounts and is verified by Google
    tenantKey: typeof c.hd === "string" && c.hd ? c.hd.toLowerCase() : null,
  };
}

function microsoftIdentity(c: Claims): VerifiedIdentity {
  const tid = String(c.tid ?? "");
  // Multi-tenant apps get tenant-specific issuers: https://login.microsoftonline.com/{tid}/v2.0
  if (!tid || c.iss !== `https://login.microsoftonline.com/${tid}/v2.0`) {
    throw new OidcError("Token was not issued by Microsoft");
  }
  const email = String(c.email ?? c.preferred_username ?? "").toLowerCase();
  if (!email.includes("@")) throw new OidcError("Microsoft account did not return an email address");

  const personal = tid === MICROSOFT_CONSUMER_TENANT;
  return {
    provider: "microsoft",
    // oid is the user's stable ID within the tenant; sub is per-app — use tenant-scoped oid when present
    subject: c.oid ? `${tid}:${String(c.oid)}` : String(c.sub),
    email,
    // Personal Microsoft account emails are verified; work-account email claims are admin-editable,
    // so they are trusted only inside their own tenant (see sso.service).
    emailVerified: personal,
    name: String(c.name ?? ""),
    picture: null,
    tenantKey: personal ? null : tid,
  };
}

/** Free email providers can never be claimed as a company domain. */
export const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "yahoo.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "zoho.com", "gmx.com",
]);

export const emailDomain = (email: string) => email.split("@")[1]?.toLowerCase() ?? "";
