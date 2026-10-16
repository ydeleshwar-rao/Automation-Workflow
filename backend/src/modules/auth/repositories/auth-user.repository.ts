import type { AuthIdentity, AuthUser, Prisma, PrismaClient } from "@prisma/client";
import prisma from "../../../lib/prisma.js";

export type AccountRole = "admin" | "developer";
export type OrganizationType = "individual" | "company";

export interface NewAuthUserInput {
  email: string;
  provider: string;
  user_metadata: Prisma.InputJsonObject;
  password_hash?: string;
  last_sign_in_at?: Date;
}

export interface NewProfileInput {
  full_name: string;
  avatar_url: string | null;
  role: AccountRole;
  created_by?: string;
}

/** Either create a new workspace owned by the new user, or join an existing one. */
export type AccountOrganizationInput =
  | { name: string; type: OrganizationType }
  | { existingOrganizationId: string };

export interface IdentityInput {
  provider: string;
  subject: string;
  email: string;
  tenant_key: string | null;
}

export interface SsoConnectionInput {
  provider: string;
  tenant_key: string;
  domain: string;
}

export interface PagePermissionGrant {
  page_key: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  granted_by: string;
}

export interface NewAccountInput {
  user: NewAuthUserInput;
  organization: AccountOrganizationInput;
  profile: NewProfileInput;
  identity?: IdentityInput;
  ssoConnection?: SsoConnectionInput;
  pagePermissions?: PagePermissionGrant[];
}

export interface CreatedAccount {
  userId: string;
  organizationId: string;
}

export type IdentityTenant = Pick<AuthIdentity, "provider" | "tenant_key">;

/**
 * Repository for login accounts (auth_users) and their external identities (auth_identities).
 * Account creation writes user + workspace + profile in one transaction so a failure never
 * leaves half-created rows.
 */
export class AuthUserRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  findByEmail(email: string): Promise<AuthUser | null> {
    return this.database.authUser.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
  }

  async findIdByEmail(email: string): Promise<string | null> {
    const user = await this.database.authUser.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  findByResetTokenHash(tokenHash: string): Promise<AuthUser | null> {
    return this.database.authUser.findFirst({ where: { reset_token_hash: tokenHash } });
  }

  async markSignedIn(userId: string, userMetadata?: Prisma.InputJsonObject): Promise<void> {
    await this.database.authUser.update({
      where: { id: userId },
      data: { last_sign_in_at: new Date(), ...(userMetadata ? { user_metadata: userMetadata } : {}) },
    });
  }

  async saveResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.database.authUser.update({
      where: { id: userId },
      data: { reset_token_hash: tokenHash, reset_token_expires_at: expiresAt },
    });
  }

  /** Sets the new password and invalidates the reset token in the same write. */
  async replacePassword(userId: string, passwordHash: string): Promise<void> {
    await this.database.authUser.update({
      where: { id: userId },
      data: { password_hash: passwordHash, reset_token_hash: null, reset_token_expires_at: null },
    });
  }

  /** The profile, its page permissions and identities are removed by ON DELETE CASCADE. */
  async delete(userId: string): Promise<void> {
    await this.database.authUser.delete({ where: { id: userId } });
  }

  createAccount(input: NewAccountInput): Promise<CreatedAccount> {
    return this.database.$transaction(async (transaction) => {
      const user = await transaction.authUser.create({
        data: { ...input.user, email: input.user.email.toLowerCase() },
      });
      const organizationId = await this.resolveOrganization(transaction, input.organization, user.id);

      await transaction.profile.create({
        data: { ...input.profile, id: user.id, email: user.email, organization_id: organizationId, is_active: true },
      });
      if (input.pagePermissions?.length) {
        await transaction.pagePermission.createMany({
          data: input.pagePermissions.map((permission) => ({ ...permission, user_id: user.id })),
        });
      }
      if (input.ssoConnection) {
        await transaction.organizationSsoConnection.create({
          data: { ...input.ssoConnection, organization_id: organizationId, created_by: user.id },
        });
      }
      if (input.identity) {
        await transaction.authIdentity.create({
          data: { ...input.identity, user_id: user.id, last_used_at: new Date() },
        });
      }
      return { userId: user.id, organizationId };
    });
  }

  /** For a login account that has no profile yet: new workspace owned by the user + admin profile. */
  createWorkspaceForUser(
    user: Pick<AuthUser, "id" | "email">,
    organization: { name: string; type: OrganizationType },
    profile: NewProfileInput,
  ): Promise<string> {
    return this.database.$transaction(async (transaction) => {
      const organizationId = await this.resolveOrganization(transaction, organization, user.id);
      await transaction.profile.create({
        data: { ...profile, id: user.id, email: user.email, organization_id: organizationId, is_active: true },
      });
      return organizationId;
    });
  }

  // ── Identities ──

  async findUserIdByIdentity(provider: string, subject: string): Promise<string | null> {
    const identity = await this.database.authIdentity.findUnique({
      where: { provider_subject: { provider, subject } },
      select: { user_id: true },
    });
    return identity?.user_id ?? null;
  }

  async linkIdentity(userId: string, identity: IdentityInput): Promise<void> {
    const identityData = { ...identity, user_id: userId, last_used_at: new Date() };
    await this.database.authIdentity.upsert({
      where: { provider_subject: { provider: identity.provider, subject: identity.subject } },
      create: identityData,
      update: identityData,
    });
  }

  findIdentityTenants(userId: string): Promise<IdentityTenant[]> {
    return this.database.authIdentity.findMany({
      where: { user_id: userId },
      select: { provider: true, tenant_key: true },
    });
  }

  private async resolveOrganization(
    transaction: Prisma.TransactionClient,
    organization: AccountOrganizationInput,
    ownerId: string,
  ): Promise<string> {
    if ("existingOrganizationId" in organization) return organization.existingOrganizationId;

    const createdOrganization = await transaction.organization.create({
      data: { name: organization.name, type: organization.type, owner_id: ownerId },
      select: { id: true },
    });
    return createdOrganization.id;
  }
}

export const authUserRepository = new AuthUserRepository();
