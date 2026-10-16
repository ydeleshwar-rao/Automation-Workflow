import type {
  Prisma,
  PrismaClient,
  IntegrationWebhookSubscription,
  WebhookEventLog,
} from "@prisma/client";
import prisma from "../../../lib/prisma.js";

export interface CreateWebhookSubscriptionInput {
  workflow_id: string;
  node_id: string;
  user_id: string;
  integration_key: string;
  event_key: string;
  config: Prisma.InputJsonValue;
  external_subscription_id: string | null;
  target_path: string;
  signing_secret: string | null;
}

export interface ResubscribeWebhookInput {
  integration_key: string;
  event_key: string;
  config: Prisma.InputJsonValue;
  external_subscription_id: string | null;
  signing_secret: string | null;
}

export interface ActiveSubscriptionLookup {
  integrationKey: string;
  eventKey: string;
  userIds: string[];
}

export interface CreateWebhookEventInput {
  subscription_id: string;
  external_event_id: string;
  event_type: string;
  payload: Prisma.InputJsonValue;
}

export type WebhookSubscriptionSummary = Pick<
  IntegrationWebhookSubscription,
  "id" | "event_key" | "is_active" | "user_id" | "workflow_id" | "created_at"
>;

const EVENT_STATUS_RECEIVED = "received";
const EVENT_STATUS_PROCESSED = "processed";
const EVENT_STATUS_FAILED = "failed";

/**
 * Repository — the only place that talks to the database for webhook
 * subscriptions and their received-event log (one aggregate).
 */
export class WebhookSubscriptionRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  findById(subscriptionId: string): Promise<IntegrationWebhookSubscription | null> {
    return this.database.integrationWebhookSubscription.findUnique({ where: { id: subscriptionId } });
  }

  findByNodeId(nodeId: string): Promise<IntegrationWebhookSubscription | null> {
    return this.database.integrationWebhookSubscription.findUnique({ where: { node_id: nodeId } });
  }

  findByTargetPath(integrationKey: string, targetPath: string): Promise<IntegrationWebhookSubscription | null> {
    return this.database.integrationWebhookSubscription.findFirst({
      where: { integration_key: integrationKey, target_path: targetPath },
    });
  }

  /** Newest active subscription for the event owned by any of the given users. */
  findNewestActiveForUsers(lookup: ActiveSubscriptionLookup): Promise<IntegrationWebhookSubscription | null> {
    return this.database.integrationWebhookSubscription.findFirst({
      where: {
        integration_key: lookup.integrationKey,
        event_key: lookup.eventKey,
        user_id: { in: lookup.userIds },
        is_active: true,
      },
      orderBy: { created_at: "desc" },
    });
  }

  findSummariesForUsers(integrationKey: string, userIds: string[]): Promise<WebhookSubscriptionSummary[]> {
    return this.database.integrationWebhookSubscription.findMany({
      where: { integration_key: integrationKey, user_id: { in: userIds } },
      select: { id: true, event_key: true, is_active: true, user_id: true, workflow_id: true, created_at: true },
    });
  }

  create(input: CreateWebhookSubscriptionInput): Promise<IntegrationWebhookSubscription> {
    return this.database.integrationWebhookSubscription.create({ data: input });
  }

  /** Re-subscribed at the vendor: store the new vendor ids and reset health. */
  resubscribe(subscriptionId: string, input: ResubscribeWebhookInput): Promise<IntegrationWebhookSubscription> {
    return this.database.integrationWebhookSubscription.update({
      where: { id: subscriptionId },
      data: { ...input, is_active: true, error_count: 0, last_error: null },
    });
  }

  setActive(subscriptionId: string, isActive: boolean): Promise<IntegrationWebhookSubscription> {
    return this.database.integrationWebhookSubscription.update({
      where: { id: subscriptionId },
      data: { is_active: isActive },
    });
  }

  /** Idempotent (no error when already gone). Event logs are removed by ON DELETE CASCADE. */
  async delete(subscriptionId: string): Promise<void> {
    await this.database.integrationWebhookSubscription.deleteMany({ where: { id: subscriptionId } });
  }

  async recordDeliverySuccess(subscriptionId: string): Promise<void> {
    await this.database.integrationWebhookSubscription.update({
      where: { id: subscriptionId },
      data: {
        last_received_at: new Date(),
        total_received: { increment: 1 },
        error_count: 0,
        last_error: null,
      },
    });
  }

  async recordDeliveryFailure(subscriptionId: string, errorMessage: string): Promise<void> {
    await this.database.integrationWebhookSubscription.update({
      where: { id: subscriptionId },
      data: { error_count: { increment: 1 }, last_error: errorMessage },
    });
  }

  // ─── Event log ───

  findEvent(subscriptionId: string, externalEventId: string): Promise<Pick<WebhookEventLog, "id"> | null> {
    return this.database.webhookEventLog.findFirst({
      where: { subscription_id: subscriptionId, external_event_id: externalEventId },
      select: { id: true },
    });
  }

  createEvent(input: CreateWebhookEventInput): Promise<WebhookEventLog> {
    return this.database.webhookEventLog.create({ data: { ...input, status: EVENT_STATUS_RECEIVED } });
  }

  async markEventProcessed(eventId: string): Promise<void> {
    await this.database.webhookEventLog.update({
      where: { id: eventId },
      data: { status: EVENT_STATUS_PROCESSED, processed_at: new Date() },
    });
  }

  async markEventFailed(eventId: string, errorMessage: string): Promise<void> {
    await this.database.webhookEventLog.update({
      where: { id: eventId },
      data: { status: EVENT_STATUS_FAILED, error: errorMessage, processed_at: new Date() },
    });
  }

  countEvents(subscriptionId: string): Promise<number> {
    return this.database.webhookEventLog.count({ where: { subscription_id: subscriptionId } });
  }
}

export const webhookSubscriptionRepository = new WebhookSubscriptionRepository();
