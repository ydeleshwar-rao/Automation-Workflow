import type { LeadInputWebhook, Prisma, PrismaClient } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface CreateLeadInputWebhookInput {
  client_id: string;
  source: string;
  payload: Prisma.InputJsonValue;
  headers: Prisma.InputJsonValue;
}

/** Repository — the only place that talks to the database for inbound GHL lead webhooks. */
export class LeadInputRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  async hasGhlToken(locationId: string): Promise<boolean> {
    const token = await this.database.ghlToken.findUnique({
      where: { location_id: locationId },
      select: { id: true },
    });
    return token !== null;
  }

  create(input: CreateLeadInputWebhookInput): Promise<LeadInputWebhook> {
    return this.database.leadInputWebhook.create({ data: input });
  }

  findLatestPayload(clientId: string): Promise<Pick<LeadInputWebhook, "payload"> | null> {
    return this.database.leadInputWebhook.findFirst({
      where: { client_id: clientId },
      orderBy: { created_at: "desc" },
      select: { payload: true },
    });
  }
}

export const leadInputRepository = new LeadInputRepository();
