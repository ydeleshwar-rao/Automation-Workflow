import type { PrismaClient, Servicem8Integration } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface ServiceM8TokenUpdate {
  access_token: string;
  refresh_token: string | null;
  expires_at: Date;
  needs_reauth: boolean;
}

export interface SaveServiceM8ConnectionInput {
  access_token: string;
  refresh_token: string | null;
  expires_at: Date;
  scopes: string | null;
  sm8_account_uuid?: string;
}

export type ServiceM8ConnectionToBackfill = Pick<
  Servicem8Integration,
  "user_id" | "access_token" | "refresh_token"
>;

/**
 * Repository — the only place that talks to the database for ServiceM8 credentials.
 * The Prisma client is injected so tests can pass a fake (Dependency Inversion).
 */
export class Servicem8IntegrationRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  findByUserId(userId: string): Promise<Servicem8Integration | null> {
    return this.database.servicem8Integration.findUnique({ where: { user_id: userId } });
  }

  /** Connections that can still be refreshed (they hold a refresh token). */
  findRefreshableConnections(): Promise<Servicem8Integration[]> {
    return this.database.servicem8Integration.findMany({
      where: { refresh_token: { not: null } },
    });
  }

  findConnectionsMissingAccountUuid(): Promise<ServiceM8ConnectionToBackfill[]> {
    return this.database.servicem8Integration.findMany({
      where: { sm8_account_uuid: null, access_token: { not: "" } },
      select: { user_id: true, access_token: true, refresh_token: true },
    });
  }

  /** Creates or replaces the connection after OAuth / credential login; clears needs_reauth. */
  saveConnection(userId: string, input: SaveServiceM8ConnectionInput): Promise<Servicem8Integration> {
    const connection = { ...input, needs_reauth: false };
    return this.database.servicem8Integration.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...connection },
      update: connection,
    });
  }

  async updateTokens(userId: string, tokenUpdate: ServiceM8TokenUpdate): Promise<void> {
    await this.database.servicem8Integration.update({ where: { user_id: userId }, data: tokenUpdate });
  }

  /** Copies rotated tokens to every other user connected to the same ServiceM8 account. */
  async updateTokensForAccountSiblings(
    sm8AccountUuid: string,
    excludedUserId: string,
    tokenUpdate: ServiceM8TokenUpdate
  ): Promise<void> {
    await this.database.servicem8Integration.updateMany({
      where: { sm8_account_uuid: sm8AccountUuid, user_id: { not: excludedUserId } },
      data: tokenUpdate,
    });
  }

  async markNeedsReauth(userId: string): Promise<void> {
    await this.database.servicem8Integration.updateMany({
      where: { user_id: userId },
      data: { needs_reauth: true },
    });
  }

  async setAccountUuid(userId: string, sm8AccountUuid: string): Promise<void> {
    await this.database.servicem8Integration.update({
      where: { user_id: userId },
      data: { sm8_account_uuid: sm8AccountUuid },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.database.servicem8Integration.delete({ where: { user_id: userId } });
  }
}

export const servicem8IntegrationRepository = new Servicem8IntegrationRepository();
