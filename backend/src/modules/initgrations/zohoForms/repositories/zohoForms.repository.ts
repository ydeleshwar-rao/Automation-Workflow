import type { PrismaClient, ZohoFormWebhook, ZohoFormsIntegration } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface ZohoFormsTokens {
  access_token: string;
  /** Zoho omits the refresh token on some re-authorisations. */
  refresh_token: string | null;
  expires_at: Date;
}

export interface SaveZohoFormWebhookInput {
  webhook_url: string;
  zoho_webhook_id: string | null;
}

/**
 * Repository — the only place that talks to the database for Zoho Forms
 * credentials and registered form webhooks. The Prisma client is injected so tests can pass a fake.
 */
export class ZohoFormsRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  // ─── Integration (OAuth tokens) ───

  findIntegrationByUserId(userId: string): Promise<ZohoFormsIntegration | null> {
    return this.database.zohoFormsIntegration.findUnique({ where: { user_id: userId } });
  }

  /** Creates or replaces the connection and clears needs_reauth. */
  saveTokens(userId: string, tokens: ZohoFormsTokens): Promise<ZohoFormsIntegration> {
    return this.database.zohoFormsIntegration.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...tokens, needs_reauth: false },
      update: { ...tokens, needs_reauth: false },
    });
  }

  async markNeedsReauth(userId: string): Promise<void> {
    await this.database.zohoFormsIntegration.updateMany({
      where: { user_id: userId },
      data: { needs_reauth: true },
    });
  }

  async deleteIntegration(userId: string): Promise<void> {
    await this.database.zohoFormsIntegration.deleteMany({ where: { user_id: userId } });
  }

  // ─── Form webhooks ───

  findWebhook(userId: string, formId: string): Promise<ZohoFormWebhook | null> {
    return this.database.zohoFormWebhook.findUnique({
      where: { user_id_form_id: { user_id: userId, form_id: formId } },
    });
  }

  findWebhooksByUserId(userId: string): Promise<ZohoFormWebhook[]> {
    return this.database.zohoFormWebhook.findMany({ where: { user_id: userId } });
  }

  saveWebhook(userId: string, formId: string, input: SaveZohoFormWebhookInput): Promise<ZohoFormWebhook> {
    return this.database.zohoFormWebhook.upsert({
      where: { user_id_form_id: { user_id: userId, form_id: formId } },
      create: { user_id: userId, form_id: formId, ...input, active: true },
      update: { ...input, active: true },
    });
  }

  async deleteWebhook(userId: string, formId: string): Promise<void> {
    await this.database.zohoFormWebhook.deleteMany({ where: { user_id: userId, form_id: formId } });
  }

  async deleteWebhooksForUser(userId: string): Promise<void> {
    await this.database.zohoFormWebhook.deleteMany({ where: { user_id: userId } });
  }
}

export const zohoFormsRepository = new ZohoFormsRepository();
