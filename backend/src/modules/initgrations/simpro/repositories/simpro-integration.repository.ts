import type { PrismaClient, SimproIntegration } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface SaveSimproConnectionInput {
  user_id: string;
  build_name: string;
  base_url: string;
  company_id: number;
  access_token: string;
  refresh_token: string | null;
  /** null = API key auth, which never expires. */
  expires_at: Date | null;
  scopes: string | null;
}

export interface UpdateSimproTokensInput {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

export type SimproConnectionStatusRow = Pick<
  SimproIntegration,
  "build_name" | "base_url" | "company_id" | "expires_at" | "scopes"
>;

/**
 * Repository — the only place that talks to the database for simPRO.
 * Only the connection credentials are stored; simPRO data is always fetched live.
 */
export class SimproIntegrationRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  findByUserId(userId: string): Promise<SimproIntegration | null> {
    return this.database.simproIntegration.findUnique({ where: { user_id: userId } });
  }

  findConnectionStatus(userId: string): Promise<SimproConnectionStatusRow | null> {
    return this.database.simproIntegration.findUnique({
      where: { user_id: userId },
      select: { build_name: true, base_url: true, company_id: true, expires_at: true, scopes: true },
    });
  }

  /** A new connection always clears needs_reauth. */
  saveConnection(input: SaveSimproConnectionInput): Promise<SimproIntegration> {
    const { user_id: userId, ...connection } = input;
    return this.database.simproIntegration.upsert({
      where: { user_id: userId },
      create: { ...input, needs_reauth: false },
      update: { ...connection, needs_reauth: false },
    });
  }

  async updateTokens(userId: string, tokens: UpdateSimproTokensInput): Promise<void> {
    await this.database.simproIntegration.update({
      where: { user_id: userId },
      data: { ...tokens, needs_reauth: false },
    });
  }

  async markNeedsReauth(userId: string): Promise<void> {
    await this.database.simproIntegration.updateMany({
      where: { user_id: userId },
      data: { needs_reauth: true },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.database.simproIntegration.deleteMany({ where: { user_id: userId } });
  }
}

export const simproIntegrationRepository = new SimproIntegrationRepository();
