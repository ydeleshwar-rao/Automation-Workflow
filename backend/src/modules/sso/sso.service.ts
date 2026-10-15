/**
 * Company SSO + social sign-in (Google, Microsoft) for DB_PROVIDER=postgres.
 *
 * Workspaces:
 *   individual  personal workspace; anyone can sign up (password, Gmail, Outlook…)
 *   company     linked to a Google Workspace domain and/or Microsoft tenant. Anyone
 *               who signs in with an account from that tenant joins it automatically
 *               as a developer with no page access until an admin grants it.
 *
 * Identities are matched by the IdP's stable subject. An email is only used to link
 * to an existing account when the IdP vouches for it (Google verified email, personal
 * Microsoft account) or when the account already belongs to the same company tenant.
 */

import { supabase as db, DB_PROVIDER } from "../../config/db.config.js";
import { ApiError } from "../../utils/ApiError.js";
import { AuthService } from "../auth/service/auth.service.js";
import { emailDomain, PUBLIC_EMAIL_DOMAINS, type SsoProvider, type VerifiedIdentity } from "../../lib/auth/oidc.js";

export type SsoIntent = "signin" | "company-setup";

type Connection = { id: string; organization_id: string; provider: SsoProvider; tenant_key: string; domain: string };
type Organization = { id: string; name: string; type: "individual" | "company"; sso_required: boolean; owner_id: string | null };

const PROVIDER_LABEL: Record<SsoProvider, string> = { google: "Google Workspace", microsoft: "Microsoft 365" };

function assertPostgres() {
  if (DB_PROVIDER !== "postgres") {
    throw new ApiError(400, "Company SSO and Microsoft sign-in need DB_PROVIDER=postgres");
  }
}

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new ApiError(500, result.error.message);
  return result.data;
}

// ── Lookups ────────────────────────────────────────────────────────────────

async function findIdentityUser(provider: SsoProvider, subject: string): Promise<string | null> {
  const row = check(await db.from("auth_identities").select("user_id").eq("provider", provider).eq("subject", subject).maybeSingle());
  return (row as { user_id: string } | null)?.user_id ?? null;
}

async function findAuthUserByEmail(email: string): Promise<string | null> {
  const row = check(await db.from("auth_users").select("id").eq("email", email.toLowerCase()).maybeSingle());
  return (row as { id: string } | null)?.id ?? null;
}

async function findConnection(provider: SsoProvider, tenantKey: string): Promise<Connection | null> {
  return check(await db.from("organization_sso_connections").select("*").eq("provider", provider).eq("tenant_key", tenantKey).maybeSingle()) as Connection | null;
}

async function profileOf(userId: string) {
  return check(await db.from("profiles").select("id,organization_id,role,is_active").eq("id", userId).maybeSingle()) as
    { id: string; organization_id: string; role: string; is_active: boolean } | null;
}

async function organization(id: string): Promise<Organization> {
  return check(await db.from("organizations").select("id,name,type,sso_required,owner_id").eq("id", id).single()) as Organization;
}

// ── Writes ─────────────────────────────────────────────────────────────────

async function createAuthUser(identity: VerifiedIdentity): Promise<string> {
  const row = check(await db.from("auth_users").insert({
    email: identity.email,
    provider: identity.provider,
    user_metadata: { full_name: identity.name, avatar_url: identity.picture },
    last_sign_in_at: new Date().toISOString(),
  }).select("id").single()) as { id: string };
  return row.id;
}

async function linkIdentity(userId: string, identity: VerifiedIdentity) {
  check(await db.from("auth_identities").upsert({
    user_id: userId,
    provider: identity.provider,
    subject: identity.subject,
    email: identity.email,
    tenant_key: identity.tenantKey,
    last_used_at: new Date().toISOString(),
  }, { onConflict: "provider,subject" }));
}

async function createOrganization(name: string, type: Organization["type"]): Promise<string> {
  const row = check(await db.from("organizations").insert({ name, type }).select("id").single()) as { id: string };
  return row.id;
}

async function createProfile(userId: string, identity: VerifiedIdentity, organizationId: string, role: "admin" | "developer") {
  check(await db.from("profiles").insert({
    id: userId,
    email: identity.email,
    full_name: identity.name || identity.email.split("@")[0],
    avatar_url: identity.picture,
    role,
    organization_id: organizationId,
    is_active: true,
  }));
}

function connectionDomain(identity: VerifiedIdentity) {
  // Google: the Workspace domain itself. Microsoft: the signing-in admin's email domain (used for discovery).
  return identity.provider === "google" ? identity.tenantKey! : emailDomain(identity.email);
}

async function addConnection(organizationId: string, identity: VerifiedIdentity, createdBy: string) {
  check(await db.from("organization_sso_connections").insert({
    organization_id: organizationId,
    provider: identity.provider,
    tenant_key: identity.tenantKey,
    domain: connectionDomain(identity),
    created_by: createdBy,
  }));
}

function requireWorkAccount(identity: VerifiedIdentity) {
  if (!identity.tenantKey || (identity.provider === "google" && PUBLIC_EMAIL_DOMAINS.has(identity.tenantKey))) {
    throw new ApiError(400,
      `Company SSO needs a ${PROVIDER_LABEL[identity.provider]} work account. ` +
      "Personal accounts (gmail.com, outlook.com…) can sign up as an individual instead.");
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export class SsoService {
  /** Sign in (or sign up) with a verified Google / Microsoft identity. */
  static async signIn(identity: VerifiedIdentity, intent: SsoIntent = "signin", organizationName?: string) {
    assertPostgres();
    if (intent === "company-setup") return this.setupCompany(identity, organizationName);

    // 1. Known identity → sign in
    const knownUserId = await findIdentityUser(identity.provider, identity.subject);
    if (knownUserId) {
      await linkIdentity(knownUserId, identity);
      return AuthService.issueAppSession(knownUserId);
    }

    const connection = identity.tenantKey ? await findConnection(identity.provider, identity.tenantKey) : null;
    const existingUserId = await findAuthUserByEmail(identity.email);

    // 2. Employee of a company that has connected this tenant
    if (connection) {
      if (existingUserId) {
        const profile = await profileOf(existingUserId);
        if (profile?.organization_id !== connection.organization_id) {
          throw new ApiError(409,
            "This email is already registered to a different workspace. Sign in with your password, " +
            "or ask your company admin to add you.");
        }
        await linkIdentity(existingUserId, identity);
        return AuthService.issueAppSession(existingUserId);
      }

      const userId = await createAuthUser(identity);
      await createProfile(userId, identity, connection.organization_id, "developer");
      await linkIdentity(userId, identity);
      return AuthService.issueAppSession(userId);
    }

    // 3. Existing account with the same email — link only when the IdP vouches for the email
    if (existingUserId) {
      if (!identity.emailVerified) {
        throw new ApiError(409,
          "An account with this email already exists. Sign in with your password, " +
          `then connect ${identity.provider === "google" ? "Google" : "Microsoft"} from your workspace settings.`);
      }
      await linkIdentity(existingUserId, identity);
      return AuthService.issueAppSession(existingUserId);
    }

    // 4. New individual
    const userId = await createAuthUser(identity);
    const organizationId = await createOrganization(`${identity.name || identity.email.split("@")[0]}'s Workspace`, "individual");
    await createProfile(userId, identity, organizationId, "admin");
    await db.from("organizations").update({ owner_id: userId }).eq("id", organizationId);
    await linkIdentity(userId, identity);
    return AuthService.issueAppSession(userId);
  }

  /** "Set up my company": creates a company workspace bound to the admin's tenant. */
  static async setupCompany(identity: VerifiedIdentity, organizationName?: string) {
    assertPostgres();
    requireWorkAccount(identity);

    const existingConnection = await findConnection(identity.provider, identity.tenantKey!);
    if (existingConnection) {
      throw new ApiError(409,
        `${connectionDomain(identity)} is already set up. Use "Continue with ${identity.provider === "google" ? "Google" : "Microsoft"}" ` +
        "to sign in — you'll join your company's workspace.");
    }

    const name = organizationName?.trim() || connectionDomain(identity);
    const userId = (await findIdentityUser(identity.provider, identity.subject)) ?? (await findAuthUserByEmail(identity.email));

    // Existing user: upgrade their personal workspace into the company workspace
    if (userId) {
      const profile = await profileOf(userId);
      if (!profile) throw new ApiError(409, "This account has no workspace. Contact support.");
      const org = await organization(profile.organization_id);
      if (org.type === "company") {
        throw new ApiError(409, `You already belong to the company workspace "${org.name}". Connect SSO from its Admin → Company SSO page.`);
      }
      if (profile.role !== "admin") throw new ApiError(403, "Only a workspace admin can set up company SSO.");

      check(await db.from("organizations").update({ name, type: "company", owner_id: org.owner_id ?? userId }).eq("id", org.id));
      await addConnection(org.id, identity, userId);
      await linkIdentity(userId, identity);
      return AuthService.issueAppSession(userId);
    }

    const newUserId = await createAuthUser(identity);
    const organizationId = await createOrganization(name, "company");
    await createProfile(newUserId, identity, organizationId, "admin");
    check(await db.from("organizations").update({ owner_id: newUserId }).eq("id", organizationId));
    await addConnection(organizationId, identity, newUserId);
    await linkIdentity(newUserId, identity);
    return AuthService.issueAppSession(newUserId);
  }

  /** Admin connects Google Workspace / Microsoft 365 to their current workspace. */
  static async connectToOrganization(identity: VerifiedIdentity, admin: { userId: string; organizationId: string }) {
    assertPostgres();
    requireWorkAccount(identity);

    const existing = await findConnection(identity.provider, identity.tenantKey!);
    if (existing && existing.organization_id !== admin.organizationId) {
      throw new ApiError(409, `${existing.domain} is already connected to another workspace.`);
    }

    const owner = await findIdentityUser(identity.provider, identity.subject);
    if (owner && owner !== admin.userId) {
      throw new ApiError(409, "This account is already used by another user. Sign in with it instead.");
    }

    if (!existing) await addConnection(admin.organizationId, identity, admin.userId);
    check(await db.from("organizations").update({ type: "company" }).eq("id", admin.organizationId));
    await linkIdentity(admin.userId, identity);
    return this.getSettings(admin.organizationId, admin.userId);
  }

  /** Which company SSO providers serve this email's domain (login page "Company SSO"). */
  static async discover(email: string) {
    assertPostgres();
    const domain = emailDomain(email);
    if (!domain || PUBLIC_EMAIL_DOMAINS.has(domain)) return { domain, providers: [] as SsoProvider[], organizationName: null };

    const rows = check(await db.from("organization_sso_connections").select("provider, organization_id").ilike("domain", domain)) as
      { provider: SsoProvider; organization_id: string }[];
    if (rows.length === 0) return { domain, providers: [] as SsoProvider[], organizationName: null };

    const org = await organization(rows[0]!.organization_id);
    return { domain, providers: [...new Set(rows.map((r) => r.provider))], organizationName: org.name };
  }

  static async getSettings(organizationId: string, userId: string) {
    assertPostgres();
    const org = await organization(organizationId);
    const connections = check(await db.from("organization_sso_connections")
      .select("id, provider, domain, tenant_key, created_at")
      .eq("organization_id", organizationId)
      .order("created_at")) as (Omit<Connection, "organization_id"> & { created_at: string })[];

    const identities = check(await db.from("auth_identities").select("provider, tenant_key").eq("user_id", userId)) as
      { provider: SsoProvider; tenant_key: string | null }[];
    const canRequireSso = connections.some((c) => identities.some((i) => i.provider === c.provider && i.tenant_key === c.tenant_key));

    return {
      organization: { id: org.id, name: org.name, type: org.type, ssoRequired: org.sso_required },
      connections: connections.map((c) => ({
        id: c.id, provider: c.provider, domain: c.domain, tenantKey: c.tenant_key, createdAt: c.created_at,
      })),
      // Prevents admins locking themselves out: they must be able to sign in with company SSO first
      canRequireSso,
    };
  }

  static async setSsoRequired(organizationId: string, userId: string, required: boolean) {
    const settings = await this.getSettings(organizationId, userId);
    if (required && !settings.canRequireSso) {
      throw new ApiError(400, "Sign in once with your company Google/Microsoft account before requiring SSO, so you don't lock yourself out.");
    }
    check(await db.from("organizations").update({ sso_required: required }).eq("id", organizationId));
    return this.getSettings(organizationId, userId);
  }

  static async removeConnection(organizationId: string, userId: string, connectionId: string) {
    assertPostgres();
    const removed = check(await db.from("organization_sso_connections").delete()
      .eq("id", connectionId).eq("organization_id", organizationId).select("id")) as { id: string }[];
    if (removed.length === 0) throw new ApiError(404, "Connection not found");

    // Without any connection nobody could satisfy "require SSO"
    const { count } = await db.from("organization_sso_connections").select("id", { count: "exact", head: true }).eq("organization_id", organizationId);
    if (!count) check(await db.from("organizations").update({ sso_required: false }).eq("id", organizationId));
    return this.getSettings(organizationId, userId);
  }

  // ── Guards used by password auth ──

  /** Password login is rejected for members of companies that require SSO. */
  static async assertPasswordLoginAllowed(userId: string) {
    if (DB_PROVIDER !== "postgres") return;
    const profile = await profileOf(userId);
    if (!profile) return;
    const org = await organization(profile.organization_id);
    if (org.type === "company" && org.sso_required) {
      throw new ApiError(403, `${org.name} requires signing in with your company Google or Microsoft account.`);
    }
  }

  /** Email sign-ups are rejected for domains whose company requires SSO. */
  static async assertEmailSignupAllowed(email: string) {
    if (DB_PROVIDER !== "postgres") return;
    const { providers, organizationName } = await this.discover(email);
    if (providers.length === 0) return;
    const rows = check(await db.from("organization_sso_connections").select("organization_id").ilike("domain", emailDomain(email)).limit(1)) as
      { organization_id: string }[];
    const org = await organization(rows[0]!.organization_id);
    if (org.sso_required) {
      throw new ApiError(403,
        `${organizationName} uses company sign-in. Use "Continue with ${providers[0] === "google" ? "Google" : "Microsoft"}" with your work account.`);
    }
  }
}
