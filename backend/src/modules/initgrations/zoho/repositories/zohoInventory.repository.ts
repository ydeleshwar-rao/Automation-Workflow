import type { PrismaClient, ZohoInventoryIntegration } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface ZohoInventoryTokens {
  access_token: string;
  /** Zoho omits the refresh token on some re-authorisations. */
  refresh_token: string | null;
  expires_at: Date;
}

export interface ZohoInventoryConnection extends ZohoInventoryTokens {
  organization_id: string;
}

/**
 * Repository — the only place that talks to the database for Zoho Inventory credentials.
 * The Prisma client is injected so tests can pass a fake (Dependency Inversion).
 */
export class ZohoInventoryRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  findByUserId(userId: string): Promise<ZohoInventoryIntegration | null> {
    return this.database.zohoInventoryIntegration.findUnique({ where: { user_id: userId } });
  }

  /** Creates or replaces the connection after OAuth; clears needs_reauth. */
  saveConnection(userId: string, connection: ZohoInventoryConnection): Promise<ZohoInventoryIntegration> {
    return this.database.zohoInventoryIntegration.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...connection, needs_reauth: false },
      update: { ...connection, needs_reauth: false },
    });
  }

  updateTokens(userId: string, tokens: ZohoInventoryTokens): Promise<ZohoInventoryIntegration> {
    return this.database.zohoInventoryIntegration.update({
      where: { user_id: userId },
      data: { ...tokens, needs_reauth: false },
    });
  }

  async markNeedsReauth(userId: string): Promise<void> {
    await this.database.zohoInventoryIntegration.updateMany({
      where: { user_id: userId },
      data: { needs_reauth: true },
    });
  }

  async delete(userId: string): Promise<void> {
    await this.database.zohoInventoryIntegration.deleteMany({ where: { user_id: userId } });
  }
}

export const zohoInventoryRepository = new ZohoInventoryRepository();
