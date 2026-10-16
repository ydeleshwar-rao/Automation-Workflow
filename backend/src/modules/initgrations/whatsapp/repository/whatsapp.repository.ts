import type { Prisma, PrismaClient, WhatsappSession } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface WhatsappAuthKeyEntry {
  key_id: string;
  key_data: Prisma.InputJsonValue;
}

export interface WhatsappWebhookConfig {
  webhook_url: string | null;
  webhook_secret: string | null;
}

export type WhatsappSessionStatusRow = Pick<WhatsappSession, "user_id" | "status">;

const DISCONNECTED_STATUS = "disconnected";

/**
 * Repository — the only place that talks to the database for WhatsApp sessions and
 * the Baileys auth key/value store (keyed by user_id + key_id).
 * The Prisma client is injected so tests can pass a fake (Dependency Inversion).
 */
export class WhatsappRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  // ─── Sessions ───────────────────────────────────────────────────────────────

  findSession(userId: string): Promise<WhatsappSession | null> {
    return this.database.whatsappSession.findUnique({ where: { user_id: userId } });
  }

  findWebhookConfig(userId: string): Promise<WhatsappWebhookConfig | null> {
    return this.database.whatsappSession.findUnique({
      where: { user_id: userId },
      select: { webhook_url: true, webhook_secret: true },
    });
  }

  /** phoneNumber undefined leaves the stored number untouched; null clears it. */
  async upsertSessionStatus(userId: string, status: string, phoneNumber?: string | null): Promise<void> {
    const phoneNumberUpdate = phoneNumber !== undefined ? { phone_number: phoneNumber } : {};
    await this.database.whatsappSession.upsert({
      where: { user_id: userId },
      create: { user_id: userId, status, ...phoneNumberUpdate },
      update: { status, ...phoneNumberUpdate },
    });
  }

  async upsertWebhook(userId: string, webhookConfig: WhatsappWebhookConfig): Promise<void> {
    await this.database.whatsappSession.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...webhookConfig },
      update: webhookConfig,
    });
  }

  async clearWebhook(userId: string): Promise<void> {
    await this.database.whatsappSession.updateMany({
      where: { user_id: userId },
      data: { webhook_url: null, webhook_secret: null },
    });
  }

  findSessionsToRestore(): Promise<WhatsappSessionStatusRow[]> {
    return this.database.whatsappSession.findMany({
      where: { status: { not: DISCONNECTED_STATUS } },
      select: { user_id: true, status: true },
    });
  }

  /** Removes the session row and every stored auth key of the user. */
  async deleteSessionAndAuthKeys(userId: string): Promise<void> {
    await this.database.$transaction([
      this.database.whatsappSession.deleteMany({ where: { user_id: userId } }),
      this.database.whatsappAuthKey.deleteMany({ where: { user_id: userId } }),
    ]);
  }

  // ─── Baileys auth key/value store ───────────────────────────────────────────

  findAuthKeys(userId: string): Promise<{ key_id: string; key_data: Prisma.JsonValue }[]> {
    return this.database.whatsappAuthKey.findMany({
      where: { user_id: userId },
      select: { key_id: true, key_data: true },
    });
  }

  async upsertAuthKeys(userId: string, entries: WhatsappAuthKeyEntry[]): Promise<void> {
    await this.database.$transaction(
      entries.map((entry) =>
        this.database.whatsappAuthKey.upsert({
          where: { user_id_key_id: { user_id: userId, key_id: entry.key_id } },
          create: { user_id: userId, key_id: entry.key_id, key_data: entry.key_data },
          update: { key_data: entry.key_data },
        })
      )
    );
  }

  async deleteAuthKeys(userId: string, keyIds: string[]): Promise<void> {
    await this.database.whatsappAuthKey.deleteMany({
      where: { user_id: userId, key_id: { in: keyIds } },
    });
  }
}

export const whatsappRepository = new WhatsappRepository();
