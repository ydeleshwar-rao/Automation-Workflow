import type { PrismaClient } from "@prisma/client";
import prisma from "../../../lib/prisma.js";

/**
 * Repository — read-only lookups on leadshub_integrations (credentials) that
 * the webhook engine needs to route OAuth-app-level GHL webhooks to a user.
 */
export class LeadshubCredentialsRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  /** Every user with an active connection to this GHL location. */
  async findActiveUserIdsForLocation(locationId: string): Promise<string[]> {
    const integrations = await this.database.leadshubIntegration.findMany({
      where: { location_id: locationId, is_active: true },
      select: { user_id: true },
    });
    return integrations.map((integration) => integration.user_id);
  }

  /** The most recently updated active connection's user, or null. */
  async findLatestActiveUserIdForLocation(locationId: string): Promise<string | null> {
    const integration = await this.database.leadshubIntegration.findFirst({
      where: { location_id: locationId, is_active: true },
      orderBy: { updated_at: "desc" },
      select: { user_id: true },
    });
    return integration?.user_id ?? null;
  }
}

export const leadshubCredentialsRepository = new LeadshubCredentialsRepository();
