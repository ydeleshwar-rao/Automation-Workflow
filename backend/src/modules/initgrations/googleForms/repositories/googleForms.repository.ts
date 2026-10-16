import type { GoogleFormWatch, GoogleFormsIntegration, PrismaClient } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface GoogleFormsTokens {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

/**
 * Repository — the only place that talks to the database for Google Forms
 * credentials and form watches. The Prisma client is injected so tests can pass a fake.
 */
export class GoogleFormsRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  // ─── Integration (OAuth tokens) ───

  findIntegrationByUserId(userId: string): Promise<GoogleFormsIntegration | null> {
    return this.database.googleFormsIntegration.findUnique({ where: { user_id: userId } });
  }

  /** Creates or replaces the connection and clears needs_reauth. */
  saveTokens(userId: string, tokens: GoogleFormsTokens): Promise<GoogleFormsIntegration> {
    return this.database.googleFormsIntegration.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...tokens, needs_reauth: false },
      update: { ...tokens, needs_reauth: false },
    });
  }

  async markNeedsReauth(userId: string): Promise<void> {
    await this.database.googleFormsIntegration.updateMany({
      where: { user_id: userId },
      data: { needs_reauth: true },
    });
  }

  async deleteIntegration(userId: string): Promise<void> {
    await this.database.googleFormsIntegration.deleteMany({ where: { user_id: userId } });
  }

  // ─── Form watches (forms polled for new responses) ───

  findWatchesByUserId(userId: string): Promise<GoogleFormWatch[]> {
    return this.database.googleFormWatch.findMany({ where: { user_id: userId } });
  }

  /** Creates the watch, or re-activates it and resets its sync cursor. */
  saveWatch(userId: string, formId: string): Promise<GoogleFormWatch> {
    return this.database.googleFormWatch.upsert({
      where: { user_id_form_id: { user_id: userId, form_id: formId } },
      create: { user_id: userId, form_id: formId, last_synced_at: null, active: true },
      update: { last_synced_at: null, active: true },
    });
  }

  async markWatchSynced(userId: string, formId: string): Promise<void> {
    await this.database.googleFormWatch.updateMany({
      where: { user_id: userId, form_id: formId },
      data: { last_synced_at: new Date() },
    });
  }

  async deleteWatch(userId: string, formId: string): Promise<void> {
    await this.database.googleFormWatch.deleteMany({ where: { user_id: userId, form_id: formId } });
  }

  async deleteWatchesForUser(userId: string): Promise<void> {
    await this.database.googleFormWatch.deleteMany({ where: { user_id: userId } });
  }
}

export const googleFormsRepository = new GoogleFormsRepository();
