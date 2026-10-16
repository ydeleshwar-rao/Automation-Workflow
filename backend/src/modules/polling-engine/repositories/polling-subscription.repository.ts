import type { Prisma, PrismaClient, PollingSubscription } from "@prisma/client";
import prisma from "../../../lib/prisma.js";

export interface CreatePollingSubscriptionInput {
  workflow_id: string;
  node_id: string;
  user_id: string;
  integration_key: string;
  event_key: string;
  config: Prisma.InputJsonValue;
  poll_interval: number;
  is_active: boolean;
}

export interface UpdatePollingSubscriptionInput {
  integration_key?: string;
  event_key?: string;
  config?: Prisma.InputJsonValue;
  poll_interval?: number;
  is_active?: boolean;
  cursor_value?: string | null;
  error_count?: number;
  last_error?: string | null;
}

export interface DueSubscriptionFilter {
  maxErrorCount: number;
  excludedIntegrationKeys: string[];
  polledBefore: Date;
}

/**
 * Repository — the only place that talks to the database for polling
 * subscriptions and their seen-record dedupe set (one aggregate).
 */
export class PollingSubscriptionRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  findById(subscriptionId: string): Promise<PollingSubscription | null> {
    return this.database.pollingSubscription.findUnique({ where: { id: subscriptionId } });
  }

  findByNodeId(nodeId: string): Promise<PollingSubscription | null> {
    return this.database.pollingSubscription.findUnique({ where: { node_id: nodeId } });
  }

  findActiveByIntegration(integrationKey: string): Promise<PollingSubscription[]> {
    return this.database.pollingSubscription.findMany({
      where: { integration_key: integrationKey, is_active: true },
    });
  }

  /** Active, healthy subscriptions never polled or last polled before `polledBefore`. */
  findDue(filter: DueSubscriptionFilter): Promise<PollingSubscription[]> {
    return this.database.pollingSubscription.findMany({
      where: {
        is_active: true,
        error_count: { lt: filter.maxErrorCount },
        integration_key: { notIn: filter.excludedIntegrationKeys },
        OR: [{ last_polled_at: null }, { last_polled_at: { lte: filter.polledBefore } }],
      },
    });
  }

  update(subscriptionId: string, input: UpdatePollingSubscriptionInput): Promise<PollingSubscription> {
    return this.database.pollingSubscription.update({ where: { id: subscriptionId }, data: input });
  }

  /** Idempotent (no error when already gone). Seen records are removed by ON DELETE CASCADE. */
  async delete(subscriptionId: string): Promise<void> {
    await this.database.pollingSubscription.deleteMany({ where: { id: subscriptionId } });
  }

  /** Idempotent on node_id: re-configuring a trigger node updates its subscription. */
  upsertByNodeId(
    input: CreatePollingSubscriptionInput,
    changes: UpdatePollingSubscriptionInput
  ): Promise<PollingSubscription> {
    return this.database.pollingSubscription.upsert({
      where: { node_id: input.node_id },
      create: input,
      update: changes,
    });
  }

  /** Clears the error state; keeps the cursor unless a new one is given. */
  async recordPollSuccess(subscriptionId: string, polledAt: Date, cursorValue?: string | null): Promise<void> {
    await this.database.pollingSubscription.update({
      where: { id: subscriptionId },
      data: {
        last_polled_at: polledAt,
        last_error: null,
        error_count: 0,
        ...(cursorValue !== undefined ? { cursor_value: cursorValue } : {}),
      },
    });
  }

  async recordPollFailure(subscriptionId: string, polledAt: Date, errorMessage: string): Promise<void> {
    await this.database.pollingSubscription.update({
      where: { id: subscriptionId },
      data: { last_polled_at: polledAt, last_error: errorMessage, error_count: { increment: 1 } },
    });
  }

  async setCursor(subscriptionId: string, cursorValue: string): Promise<void> {
    await this.database.pollingSubscription.update({
      where: { id: subscriptionId },
      data: { cursor_value: cursorValue },
    });
  }

  async deactivateActiveByNodeId(nodeId: string): Promise<void> {
    await this.database.pollingSubscription.updateMany({
      where: { node_id: nodeId, is_active: true },
      data: { is_active: false },
    });
  }

  // ─── Seen records (dedupe set) ───

  async findSeenExternalIds(subscriptionId: string, externalIds: string[]): Promise<Set<string>> {
    const seenRecords = await this.database.pollingSeenRecord.findMany({
      where: { subscription_id: subscriptionId, external_id: { in: externalIds } },
      select: { external_id: true },
    });
    return new Set(seenRecords.map((seenRecord) => seenRecord.external_id));
  }

  /** Idempotent: ids already marked for this subscription are skipped. */
  async markSeen(subscriptionId: string, externalIds: string[]): Promise<void> {
    if (externalIds.length === 0) return;
    await this.database.pollingSeenRecord.createMany({
      data: externalIds.map((externalId) => ({ subscription_id: subscriptionId, external_id: externalId })),
      skipDuplicates: true,
    });
  }

  countSeenRecords(subscriptionId: string): Promise<number> {
    return this.database.pollingSeenRecord.count({ where: { subscription_id: subscriptionId } });
  }
}

export const pollingSubscriptionRepository = new PollingSubscriptionRepository();
