/**
 * Company SSO + social sign-in (Google, Microsoft).
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

import { ApiError } from "../../utils/ApiError.js";
import { AuthService } from "../auth/service/auth.service.js";
import {
  authUserRepository,
  type AccountOrganizationInput,
  type AccountRole,
  type IdentityInput,
  type SsoConnectionInput,
} from "../auth/repositories/auth-user.repository.js";
import { profileRepository } from "../auth/repositories/profile.repository.js";
import { ssoRepository, type OrganizationSummary } from "./sso.repository.js";
import { emailDomain, PUBLIC_EMAIL_DOMAINS, type SsoProvider, type VerifiedIdentity } from "../../lib/auth/oidc.js";

export type SsoIntent = "signin" | "company-setup";

const PROVIDER_LABEL: Record<SsoProvider, string> = { google: "Google Workspace", microsoft: "Microsoft 365" };
const PROVIDER_SHORT_LABEL: Record<SsoProvider, string> = { google: "Google", microsoft: "Microsoft" };

// ── Helpers ────────────────────────────────────────────────────────────────

async function getOrganization(organizationId: string): Promise<OrganizationSummary> {
  const organization = await ssoRepository.findOrganization(organizationId);
  if (!organization) throw new ApiError(404, "Organization not found");
  return organization;
}

function toIdentityInput(identity: VerifiedIdentity): IdentityInput {
  return {
    provider: identity.provider,
    subject: identity.subject,
    email: identity.email,
    tenant_key: identity.tenantKey,
  };
}

function connectionDomain(identity: VerifiedIdentity) {
  // Google: the Workspace domain itself. Microsoft: the signing-in admin's email domain (used for discovery).
  return identity.provider === "google" ? identity.tenantKey! : emailDomain(identity.email);
}

function toConnectionInput(identity: VerifiedIdentity): SsoConnectionInput {
  return { provider: identity.provider, tenant_key: identity.tenantKey!, domain: connectionDomain(identity) };
}

function displayName(identity: VerifiedIdentity) {
  return identity.name || identity.email.split("@")[0] || "";
}

/** Login account + profile (+ new workspace when asked) + identity, all in one transaction. */
async function createSsoAccount(
  identity: VerifiedIdentity,
  organization: AccountOrganizationInput,
  role: AccountRole,
  ssoConnection?: SsoConnectionInput,
) {
  const { userId } = await authUserRepository.createAccount({
    user: {
      email: identity.email,
      provider: identity.provider,
      user_metadata: { full_name: identity.name, avatar_url: identity.picture },
      last_sign_in_at: new Date(),
    },
    organization,
    profile: { full_name: displayName(identity), avatar_url: identity.picture, role },
    identity: toIdentityInput(identity),
    ...(ssoConnection ? { ssoConnection } : {}),
  });
  return userId;
}

async function linkAndIssueSession(userId: string, identity: VerifiedIdentity) {
  await authUserRepository.linkIdentity(userId, toIdentityInput(identity));
  return AuthService.issueAppSession(userId);
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
    if (intent === "company-setup") return this.setupCompany(identity, organizationName);

    // 1. Known identity → sign in
    const knownUserId = await authUserRepository.findUserIdByIdentity(identity.provider, identity.subject);
    if (knownUserId) return linkAndIssueSession(knownUserId, identity);

    const connection = identity.tenantKey ? await ssoRepository.findConnection(identity.provider, identity.tenantKey) : null;
    const existingUserId = await authUserRepository.findIdByEmail(identity.email);

    // 2. Employee of a company that has connected this tenant
    if (connection) {
      if (!existingUserId) {
        const userId = await createSsoAccount(identity, { existingOrganizationId: connection.organization_id }, "developer");
        return AuthService.issueAppSession(userId);
      }

      const profile = await profileRepository.findSessionProfile(existingUserId);
      if (profile?.organization_id !== connection.organization_id) {
        throw new ApiError(409,
          "This email is already registered to a different workspace. Sign in with your password, " +
          "or ask your company admin to add you.");
      }
      return linkAndIssueSession(existingUserId, identity);
    }

    // 3. Existing account with the same email — link only when the IdP vouches for the email
    if (existingUserId) {
      if (!identity.emailVerified) {
        throw new ApiError(409,
          "An account with this email already exists. Sign in with your password, " +
          `then connect ${PROVIDER_SHORT_LABEL[identity.provider]} from your workspace settings.`);
      }
      return linkAndIssueSession(existingUserId, identity);
    }

    // 4. New individual
    const userId = await createSsoAccount(
      identity,
      { name: `${displayName(identity)}'s Workspace`, type: "individual" },
      "admin",
    );
    return AuthService.issueAppSession(userId);
  }

  /** "Set up my company": creates a company workspace bound to the admin's tenant. */
  static async setupCompany(identity: VerifiedIdentity, organizationName?: string) {
    requireWorkAccount(identity);

    const existingConnection = await ssoRepository.findConnection(identity.provider, identity.tenantKey!);
    if (existingConnection) {
      throw new ApiError(409,
        `${connectionDomain(identity)} is already set up. Use "Continue with ${PROVIDER_SHORT_LABEL[identity.provider]}" ` +
        "to sign in — you'll join your company's workspace.");
    }

    const name = organizationName?.trim() || connectionDomain(identity);
    const userId = (await authUserRepository.findUserIdByIdentity(identity.provider, identity.subject))
      ?? (await authUserRepository.findIdByEmail(identity.email));

    if (!userId) {
      const newUserId = await createSsoAccount(identity, { name, type: "company" }, "admin", toConnectionInput(identity));
      return AuthService.issueAppSession(newUserId);
    }

    // Existing user: upgrade their personal workspace into the company workspace
    const profile = await profileRepository.findSessionProfile(userId);
    if (!profile) throw new ApiError(409, "This account has no workspace. Contact support.");
    const organization = await getOrganization(profile.organization_id);
    if (organization.type === "company") {
      throw new ApiError(409, `You already belong to the company workspace "${organization.name}". Connect SSO from its Admin → Company SSO page.`);
    }
    if (profile.role !== "admin") throw new ApiError(403, "Only a workspace admin can set up company SSO.");

    await ssoRepository.convertToCompany(
      organization.id,
      { name, owner_id: organization.owner_id ?? userId },
      toConnectionInput(identity),
      userId,
    );
    return linkAndIssueSession(userId, identity);
  }

  /** Admin connects Google Workspace / Microsoft 365 to their current workspace. */
  static async connectToOrganization(identity: VerifiedIdentity, admin: { userId: string; organizationId: string }) {
    requireWorkAccount(identity);

    const existingConnection = await ssoRepository.findConnection(identity.provider, identity.tenantKey!);
    if (existingConnection && existingConnection.organization_id !== admin.organizationId) {
      throw new ApiError(409, `${existingConnection.domain} is already connected to another workspace.`);
    }

    const identityOwnerId = await authUserRepository.findUserIdByIdentity(identity.provider, identity.subject);
    if (identityOwnerId && identityOwnerId !== admin.userId) {
      throw new ApiError(409, "This account is already used by another user. Sign in with it instead.");
    }

    if (existingConnection) {
      await ssoRepository.updateOrganization(admin.organizationId, { type: "company" });
    } else {
      await ssoRepository.convertToCompany(admin.organizationId, {}, toConnectionInput(identity), admin.userId);
    }
    await authUserRepository.linkIdentity(admin.userId, toIdentityInput(identity));
    return this.getSettings(admin.organizationId, admin.userId);
  }

  /** Which company SSO providers serve this email's domain (login page "Company SSO"). */
  static async discover(email: string) {
    const domain = emailDomain(email);
    const noProviders = { domain, providers: [] as SsoProvider[], organizationName: null };
    if (!domain || PUBLIC_EMAIL_DOMAINS.has(domain)) return noProviders;

    const connections = await ssoRepository.findConnectionsByDomain(domain);
    const firstConnection = connections[0];
    if (!firstConnection) return noProviders;

    return {
      domain,
      providers: [...new Set(connections.map((connection) => connection.provider as SsoProvider))],
      organizationName: firstConnection.organization.name,
    };
  }

  static async getSettings(organizationId: string, userId: string) {
    const organization = await getOrganization(organizationId);
    const connections = await ssoRepository.findConnectionsOfOrganization(organizationId);
    const identities = await authUserRepository.findIdentityTenants(userId);
    const canRequireSso = connections.some((connection) =>
      identities.some((identity) => identity.provider === connection.provider && identity.tenant_key === connection.tenant_key));

    return {
      organization: { id: organization.id, name: organization.name, type: organization.type, ssoRequired: organization.sso_required },
      connections: connections.map((connection) => ({
        id: connection.id,
        provider: connection.provider,
        domain: connection.domain,
        tenantKey: connection.tenant_key,
        createdAt: connection.created_at,
      })),
      // Prevents admins locking themselves out: they must be able to sign in with company SSO first
      canRequireSso,
    };
  }

  static async setSsoRequired(organizationId: string, userId: string, isRequired: boolean) {
    const settings = await this.getSettings(organizationId, userId);
    if (isRequired && !settings.canRequireSso) {
      throw new ApiError(400, "Sign in once with your company Google/Microsoft account before requiring SSO, so you don't lock yourself out.");
    }
    await ssoRepository.updateOrganization(organizationId, { sso_required: isRequired });
    return this.getSettings(organizationId, userId);
  }

  static async removeConnection(organizationId: string, userId: string, connectionId: string) {
    const removedCount = await ssoRepository.deleteConnection(organizationId, connectionId);
    if (removedCount === 0) throw new ApiError(404, "Connection not found");

    // Without any connection nobody could satisfy "require SSO"
    const remainingCount = await ssoRepository.countConnections(organizationId);
    if (remainingCount === 0) await ssoRepository.updateOrganization(organizationId, { sso_required: false });
    return this.getSettings(organizationId, userId);
  }

  // ── Guards used by password auth ──

  /** Password login is rejected for members of companies that require SSO. */
  static async assertPasswordLoginAllowed(userId: string) {
    const profile = await profileRepository.findSessionProfile(userId);
    if (!profile) return;
    const organization = await getOrganization(profile.organization_id);
    if (organization.type === "company" && organization.sso_required) {
      throw new ApiError(403, `${organization.name} requires signing in with your company Google or Microsoft account.`);
    }
  }

  /** Email sign-ups are rejected for domains whose company requires SSO. */
  static async assertEmailSignupAllowed(email: string) {
    const domain = emailDomain(email);
    if (!domain || PUBLIC_EMAIL_DOMAINS.has(domain)) return;

    const [firstConnection] = await ssoRepository.findConnectionsByDomain(domain);
    if (!firstConnection?.organization.sso_required) return;

    throw new ApiError(403,
      `${firstConnection.organization.name} uses company sign-in. ` +
      `Use "Continue with ${PROVIDER_SHORT_LABEL[firstConnection.provider as SsoProvider]}" with your work account.`);
  }
}
