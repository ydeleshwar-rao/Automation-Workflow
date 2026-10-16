import type { PrismaClient, RazorpayIntegration } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface SaveRazorpayCredentialsInput {
  key_id: string;
  key_secret: string;
  webhook_secret: string;
}

/**
 * Repository — the only place that talks to the database for Razorpay credentials.
 * The Prisma client is injected so tests can pass a fake (Dependency Inversion).
 */
export class RazorpayRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  findByUserId(userId: string): Promise<RazorpayIntegration | null> {
    return this.database.razorpayIntegration.findUnique({ where: { user_id: userId } });
  }

  saveCredentials(userId: string, input: SaveRazorpayCredentialsInput): Promise<RazorpayIntegration> {
    return this.database.razorpayIntegration.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...input },
      update: input,
    });
  }

  async saveRazorpayWebhookId(userId: string, razorpayWebhookId: string): Promise<void> {
    await this.database.razorpayIntegration.updateMany({
      where: { user_id: userId },
      data: { razorpay_webhook_id: razorpayWebhookId },
    });
  }

  async delete(userId: string): Promise<void> {
    await this.database.razorpayIntegration.deleteMany({ where: { user_id: userId } });
  }
}

export const razorpayRepository = new RazorpayRepository();
