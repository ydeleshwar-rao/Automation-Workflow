import type { Prisma, PrismaClient, Webhook, WebhookEvent } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface CreateWebhookInput {
  user_id: string;
  name: string;
  unique_path: string;
  full_url: string;
  action_type: string;
  workflow_id: string;
  status: string;
}

export interface UpdateWebhookInput {
  mode?: string;
  status?: string;
  expires_at?: Date | null;
}

export interface NewWebhookEvent {
  webhook_id: string;
  request_headers: Prisma.InputJsonValue;
  request_body: Prisma.InputJsonValue;
}

export interface NewWebhookAttempt {
  event_id: string;
  response_status: number;
  error_message: string | null;
}

export type WebhookEventSummary = Pick<WebhookEvent, "id" | "webhook_id" | "request_body">;

const EVENT_SUMMARY_SELECT = { id: true, webhook_id: true, request_body: true } as const;

/** Repository — the only place that talks to the database for dynamic webhooks, their events and delivery attempts. */
export class WebhookRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  create(input: CreateWebhookInput): Promise<Webhook> {
    return this.database.webhook.create({ data: input });
  }

  /** Active, not deleted and not expired at `now`. */
  findActiveByPath(uniquePath: string, now: Date): Promise<Webhook | null> {
    return this.database.webhook.findFirst({
      where: {
        unique_path: uniquePath,
        status: "active",
        deleted_at: null,
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
      },
    });
  }

  async markTriggered(webhookId: string, triggeredAt: Date): Promise<void> {
    await this.database.webhook.update({
      where: { id: webhookId },
      data: { last_triggered_at: triggeredAt },
    });
  }

  update(webhookId: string, input: UpdateWebhookInput): Promise<Webhook> {
    return this.database.webhook.update({ where: { id: webhookId }, data: input });
  }

  createEvent(input: NewWebhookEvent): Promise<WebhookEvent> {
    return this.database.webhookEvent.create({ data: { ...input, status: "pending" } });
  }

  async setEventStatus(eventId: string, status: string, processedAt?: Date): Promise<void> {
    await this.database.webhookEvent.update({
      where: { id: eventId },
      data: { status, ...(processedAt ? { processed_at: processedAt } : {}) },
    });
  }

  findLatestEvent(webhookId: string): Promise<WebhookEventSummary | null> {
    return this.database.webhookEvent.findFirst({
      where: { webhook_id: webhookId },
      orderBy: { received_at: "desc" },
      select: EVENT_SUMMARY_SELECT,
    });
  }

  /** Oldest first, so events are handled in arrival order. */
  findPendingEvents(webhookId: string): Promise<WebhookEventSummary[]> {
    return this.database.webhookEvent.findMany({
      where: { webhook_id: webhookId, status: "pending" },
      orderBy: { received_at: "asc" },
      select: EVENT_SUMMARY_SELECT,
    });
  }

  updateEventRequestBody(eventId: string, requestBody: Prisma.InputJsonValue): Promise<WebhookEvent[]> {
    return this.database.webhookEvent.updateManyAndReturn({
      where: { id: eventId },
      data: { request_body: requestBody },
    });
  }

  /** attempt_no is the next number for the event; counted and written in one transaction. */
  async recordAttempt(input: NewWebhookAttempt): Promise<number> {
    return this.database.$transaction(async (transaction) => {
      const previousAttempts = await transaction.webhookAttempt.count({ where: { event_id: input.event_id } });
      const attemptNo = previousAttempts + 1;
      await transaction.webhookAttempt.create({ data: { ...input, attempt_no: attemptNo } });
      return attemptNo;
    });
  }
}

export const webhookRepository = new WebhookRepository();
