import type {
  GoogleSheetRowFingerprint,
  GoogleSheetWatch,
  GoogleSheetsIntegration,
  PrismaClient,
} from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface GoogleSheetsTokens {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

/** Identifies one watch: a sheet tab polled for one trigger type. */
export interface GoogleSheetWatchKey {
  user_id: string;
  spreadsheet_id: string;
  sheet_name: string;
  trigger_type: string;
}

export interface RowFingerprintInput {
  row_number: number;
  content_hash: string;
}

export type StoredRowFingerprint = Pick<GoogleSheetRowFingerprint, "row_number" | "content_hash">;

/**
 * Repository — the only place that talks to the database for Google Sheets
 * credentials, watches and row fingerprints. The Prisma client is injected so tests can pass a fake.
 */
export class GoogleSheetsRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  // ─── Integration (OAuth tokens) ───

  findIntegrationByUserId(userId: string): Promise<GoogleSheetsIntegration | null> {
    return this.database.googleSheetsIntegration.findUnique({ where: { user_id: userId } });
  }

  /** Creates or replaces the connection and clears needs_reauth. */
  saveTokens(userId: string, tokens: GoogleSheetsTokens): Promise<GoogleSheetsIntegration> {
    return this.database.googleSheetsIntegration.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...tokens, needs_reauth: false },
      update: { ...tokens, needs_reauth: false },
    });
  }

  async markNeedsReauth(userId: string): Promise<void> {
    await this.database.googleSheetsIntegration.updateMany({
      where: { user_id: userId },
      data: { needs_reauth: true },
    });
  }

  async deleteIntegration(userId: string): Promise<void> {
    await this.database.googleSheetsIntegration.deleteMany({ where: { user_id: userId } });
  }

  // ─── Watches (polling subscriptions) ───

  findWatch(watchKey: GoogleSheetWatchKey): Promise<GoogleSheetWatch | null> {
    return this.database.googleSheetWatch.findUnique({
      where: { user_id_spreadsheet_id_sheet_name_trigger_type: watchKey },
    });
  }

  findWatchesByUserId(userId: string): Promise<GoogleSheetWatch[]> {
    return this.database.googleSheetWatch.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
  }

  findActiveWatchesByUserId(userId: string): Promise<GoogleSheetWatch[]> {
    return this.database.googleSheetWatch.findMany({ where: { user_id: userId, active: true } });
  }

  /** Creates the watch, or re-activates it and resets its cursors. */
  saveWatch(watchKey: GoogleSheetWatchKey): Promise<GoogleSheetWatch> {
    const resetCursor = { last_row_count: 0, last_synced_at: null, active: true };
    return this.database.googleSheetWatch.upsert({
      where: { user_id_spreadsheet_id_sheet_name_trigger_type: watchKey },
      create: { ...watchKey, ...resetCursor },
      update: resetCursor,
    });
  }

  async markWatchSynced(watchId: string, lastRowCount?: number): Promise<void> {
    await this.database.googleSheetWatch.update({
      where: { id: watchId },
      data: {
        last_synced_at: new Date(),
        ...(lastRowCount === undefined ? {} : { last_row_count: lastRowCount }),
      },
    });
  }

  /** Row fingerprints are removed by ON DELETE CASCADE. */
  async deleteWatch(watchKey: GoogleSheetWatchKey): Promise<void> {
    await this.database.googleSheetWatch.deleteMany({ where: watchKey });
  }

  async deleteWatchesForUser(userId: string): Promise<void> {
    await this.database.googleSheetWatch.deleteMany({ where: { user_id: userId } });
  }

  // ─── Row fingerprints (change detection without storing row contents) ───

  findRowFingerprints(watchId: string): Promise<StoredRowFingerprint[]> {
    return this.database.googleSheetRowFingerprint.findMany({
      where: { watch_id: watchId },
      select: { row_number: true, content_hash: true },
    });
  }

  async saveRowFingerprints(watchId: string, fingerprints: RowFingerprintInput[]): Promise<void> {
    if (!fingerprints.length) return;
    await this.database.$transaction(
      fingerprints.map((fingerprint) =>
        this.database.googleSheetRowFingerprint.upsert({
          where: { watch_id_row_number: { watch_id: watchId, row_number: fingerprint.row_number } },
          create: { watch_id: watchId, ...fingerprint },
          update: { content_hash: fingerprint.content_hash },
        })
      )
    );
  }
}

export const googleSheetsRepository = new GoogleSheetsRepository();
