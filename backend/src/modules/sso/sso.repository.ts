import type { Organization, OrganizationSsoConnection, PrismaClient } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import type { SsoConnectionInput } from "../auth/repositories/auth-user.repository.js";

export type OrganizationSummary = Pick<Organization, "id" | "name" | "type" | "sso_required" | "owner_id">;

export type ConnectionSummary = Pick<OrganizationSsoConnection, "id" | "provider" | "domain" | "tenant_key" | "created_at">;

export type DomainConnection = Pick<OrganizationSsoConnection, "provider" | "organization_id"> & {
  organization: Pick<Organization, "name" | "sso_required">;
};

export interface OrganizationChanges {
  name?: string;
  type?: string;
  owner_id?: string;
  sso_required?: boolean;
}

const ORGANIZATION_SUMMARY_SELECT = { id: true, name: true, type: true, sso_required: true, owner_id: true } as const;

/** Repository for workspaces and their company SSO connections. */
export class SsoRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  findOrganization(organizationId: string): Promise<OrganizationSummary | null> {
    return this.database.organization.findUnique({
      where: { id: organizationId },
      select: ORGANIZATION_SUMMARY_SELECT,
    });
  }

  async updateOrganization(organizationId: string, changes: OrganizationChanges): Promise<void> {
    await this.database.organization.update({ where: { id: organizationId }, data: changes });
  }

  findConnection(provider: string, tenantKey: string): Promise<OrganizationSsoConnection | null> {
    return this.database.organizationSsoConnection.findUnique({
      where: { provider_tenant_key: { provider, tenant_key: tenantKey } },
    });
  }

  /** Case-insensitive domain match, oldest connection first. */
  findConnectionsByDomain(domain: string): Promise<DomainConnection[]> {
    return this.database.organizationSsoConnection.findMany({
      where: { domain: { equals: domain, mode: "insensitive" } },
      orderBy: { created_at: "asc" },
      select: {
        provider: true,
        organization_id: true,
        organization: { select: { name: true, sso_required: true } },
      },
    });
  }

  findConnectionsOfOrganization(organizationId: string): Promise<ConnectionSummary[]> {
    return this.database.organizationSsoConnection.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: "asc" },
      select: { id: true, provider: true, domain: true, tenant_key: true, created_at: true },
    });
  }

  countConnections(organizationId: string): Promise<number> {
    return this.database.organizationSsoConnection.count({ where: { organization_id: organizationId } });
  }

  async createConnection(organizationId: string, connection: SsoConnectionInput, createdBy: string): Promise<void> {
    await this.database.organizationSsoConnection.create({
      data: { ...connection, organization_id: organizationId, created_by: createdBy },
    });
  }

  /** Returns how many rows were deleted (0 when the connection is not in this workspace). */
  async deleteConnection(organizationId: string, connectionId: string): Promise<number> {
    const result = await this.database.organizationSsoConnection.deleteMany({
      where: { id: connectionId, organization_id: organizationId },
    });
    return result.count;
  }

  /** Turns a workspace into a company workspace and connects its SSO tenant atomically. */
  async convertToCompany(
    organizationId: string,
    changes: OrganizationChanges,
    connection: SsoConnectionInput,
    createdBy: string,
  ): Promise<void> {
    await this.database.$transaction([
      this.database.organization.update({ where: { id: organizationId }, data: { ...changes, type: "company" } }),
      this.database.organizationSsoConnection.create({
        data: { ...connection, organization_id: organizationId, created_by: createdBy },
      }),
    ]);
  }
}

export const ssoRepository = new SsoRepository();
