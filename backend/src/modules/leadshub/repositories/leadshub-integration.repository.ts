import type { LeadshubIntegration, PrismaClient } from "@prisma/client";
import prisma from "../../../lib/prisma.js";

export interface SaveLeadshubIntegrationInput {
  user_id: string;
  company_id: string | null;
  location_id: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_in: number;
  expires_at: Date;
  user_type: string | null;
}

export interface RefreshedLeadshubTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: Date;
}

export type LeadshubIntegrationWithOwner = LeadshubIntegration & {
  user: { full_name: string; email: string; organization: { name: string } };
};

/**
 * Repository — the only place that talks to the database for LeadsHub (GHL) integrations.
 * The Prisma client is injected so tests can pass a fake (Dependency Inversion).
 */
export class LeadshubIntegrationRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  /** Most recently updated integration of the user, active or not. */
  findLatestByUserId(userId: string): Promise<LeadshubIntegration | null> {
    return this.database.leadshubIntegration.findFirst({
      where: { user_id: userId },
      orderBy: { updated_at: "desc" },
    });
  }

  findActiveByUserId(userId: string): Promise<LeadshubIntegration | null> {
    return this.database.leadshubIntegration.findFirst({
      where: { user_id: userId, is_active: true },
      orderBy: { updated_at: "desc" },
    });
  }

  /** Active integration plus the owner's name, email and organization name. */
  findActiveWithOwnerByUserId(userId: string): Promise<LeadshubIntegrationWithOwner | null> {
    return this.database.leadshubIntegration.findFirst({
      where: { user_id: userId, is_active: true },
      orderBy: { updated_at: "desc" },
      include: {
        user: {
          select: { full_name: true, email: true, organization: { select: { name: true } } },
        },
      },
    });
  }

  findActiveByLocationId(locationId: string): Promise<LeadshubIntegration | null> {
    return this.database.leadshubIntegration.findFirst({
      where: { location_id: locationId, is_active: true },
      orderBy: { updated_at: "desc" },
    });
  }

  /** Re-connecting the same user + location updates the existing row instead of adding a duplicate. */
  async save(input: SaveLeadshubIntegrationInput): Promise<LeadshubIntegration> {
    const existing = await this.database.leadshubIntegration.findFirst({
      where: { user_id: input.user_id, location_id: input.location_id },
      select: { id: true },
    });
    const data = { ...input, expires_in: BigInt(input.expires_in), is_active: true };

    if (existing) {
      return this.database.leadshubIntegration.update({ where: { id: existing.id }, data });
    }
    return this.database.leadshubIntegration.create({ data });
  }

  async updateTokensByLocationId(locationId: string, tokens: RefreshedLeadshubTokens): Promise<void> {
    await this.database.leadshubIntegration.updateMany({
      where: { location_id: locationId },
      data: { ...tokens, expires_in: BigInt(tokens.expires_in) },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.database.leadshubIntegration.deleteMany({ where: { user_id: userId } });
  }
}

export const leadshubIntegrationRepository = new LeadshubIntegrationRepository();
