import { IncomingHttpHeaders } from "http";
import { randomBytes } from "crypto";
import type { Prisma, Webhook, WebhookEvent } from "@prisma/client";
import { executeWorkflow, findWorkflowByWebhookId } from "../../../workflow-automation/processor/webhookProcessor.js";
import {
  findWebhookTriggerNodeService,
  saveSamplePayloadService,
} from "../../../workflow-automation/node/node.service.js";
import { webhookRepository, type UpdateWebhookInput } from "../repositories/webhook.repository.js";
import { buildPublicApiUrl } from "../../../../config/api.config.js";
import { ApiError } from "../../../../utils/ApiError.js";
import { webhookLogger as log } from "../../../../utils/logger.js";

const UNIQUE_PATH_BYTES = 8;
const HTTP_OK = 200;
const HTTP_SERVER_ERROR = 500;

export async function createWebhookService({
  name,
  action_type,
  user_id,
  workflow_id,
}: {
  name: string;
  user_id: string;
  action_type: string;
  workflow_id: string;
}) {
  try {
    const uniquePath = randomBytes(UNIQUE_PATH_BYTES).toString("hex");

    const webhook = await webhookRepository.create({
      user_id,
      name,
      unique_path: uniquePath,
      full_url: buildPublicApiUrl(`/webhooks/${uniquePath}`),
      action_type,
      workflow_id,
      status: "active",
    });

    log.info("WEBHOOK CREATED", {
      webhook_id: webhook.id,
      name,
      url: webhook.full_url,
      path: uniquePath,
      workflow_id,
      user_id,
      mode: "test",
    });

    return { id: webhook.id, full_url: webhook.full_url };
  } catch (error: any) {
    log.error("create webhook failed", { error: error?.message, name, workflow_id });
    throw error;
  }
}

export async function processIncomingWebhook({
  hookPath,
  headers,
  body,
}: {
  hookPath: string;
  headers: IncomingHttpHeaders;
  body: unknown;
}) {
  const cleanPath = hookPath.trim().toLowerCase();
  const bodyObject = body as Record<string, any>;

  log.info("INCOMING", {
    path: cleanPath,
    email: bodyObject?.email ?? bodyObject?.contact?.email ?? "",
    name: bodyObject?.firstname ?? bodyObject?.firstName ?? bodyObject?.full_name ?? bodyObject?.name ?? "",
    phone: bodyObject?.phone ?? bodyObject?.mobile ?? "",
    fields: Object.keys(bodyObject ?? {}).length,
    userAgent: (headers["user-agent"] ?? "").slice(0, 60),
  });

  const webhook = await webhookRepository.findActiveByPath(cleanPath, new Date());
  if (!webhook) {
    log.error("webhook not found", { path: cleanPath, error: "no data" });
    throw new ApiError(404, "Webhook not found or inactive");
  }

  log.info("webhook resolved", { webhook_id: webhook.id, name: webhook.name, mode: webhook.mode });

  const cleanHeaders = JSON.parse(JSON.stringify(headers ?? {}));
  const cleanBody = JSON.parse(JSON.stringify(body ?? {}));

  const event = await webhookRepository.createEvent({
    webhook_id: webhook.id,
    request_headers: cleanHeaders,
    request_body: cleanBody,
  });
  log.info("event saved", { event_id: event.id, webhook_id: event.webhook_id, mode: webhook.mode });

  await webhookRepository.markTriggered(webhook.id, new Date());

  if (webhook.mode === "live") {
    await runLinkedWorkflow(webhook, event, cleanBody);
  } else if (webhook.mode === "test") {
    await saveTestSamplePayload(webhook, cleanBody);
  }

  log.info("DONE", { event_id: event.id, webhook_id: webhook.id, mode: webhook.mode });
  return event;
}

/** Starts the workflow in the background; the HTTP caller does not wait for it. */
async function runLinkedWorkflow(webhook: Webhook, event: WebhookEvent, cleanBody: Record<string, any>) {
  const result = await findWorkflowByWebhookId(webhook.id);
  if (!result) {
    log.warn("no active workflow linked", { webhook_id: webhook.id });
    return;
  }

  log.info("executing workflow", { workflow_id: result.workflowId, event_id: event.id, webhook_id: webhook.id });
  executeWorkflow(result.workflowId, cleanBody)
    .then(async ({ success, error: executionError }) => {
      if (success) {
        await recordWebhookAttempt(event.id, HTTP_OK, null);
        await webhookRepository.setEventStatus(event.id, "processed", new Date());
        log.info("END — processed", { event_id: event.id, workflow_id: result.workflowId });
      } else {
        await recordWebhookAttempt(event.id, HTTP_SERVER_ERROR, executionError ?? "Unknown error");
        await webhookRepository.setEventStatus(event.id, "failed");
        log.error("END — workflow failed", { event_id: event.id, workflow_id: result.workflowId, error: executionError });
      }
    })
    .catch(async (error) => {
      log.error("END — unexpected error", { event_id: event.id, error: error.message });
      await recordWebhookAttempt(event.id, HTTP_SERVER_ERROR, error.message);
      await webhookRepository.setEventStatus(event.id, "failed").catch(() => undefined);
    });
}

/** Test mode only records the payload shape for field mapping; failures are logged, not thrown. */
async function saveTestSamplePayload(webhook: Webhook, cleanBody: Record<string, any>) {
  log.info("TEST mode — saving sample payload", { webhook_id: webhook.id });
  try {
    const triggerNode = await findWebhookTriggerNodeService(webhook.id);
    if (!triggerNode) {
      log.warn("no trigger node found", { webhook_id: webhook.id });
      return;
    }
    await saveSamplePayloadService(triggerNode.id, cleanBody);
    log.info("sample payload saved", { node_id: triggerNode.id, fields: Object.keys(cleanBody) });
  } catch (error: any) {
    log.error("sample payload save failed", { webhook_id: webhook.id, error: error?.message });
  }
}

export function getNextPendingWebhookEvent(webhookId: string) {
  return webhookRepository.findPendingEvents(webhookId);
}

/** Delivery attempts are bookkeeping — a failed write is logged and never breaks the caller. */
async function recordWebhookAttempt(
  eventId: string,
  responseStatus: number,
  errorMessage: string | null
): Promise<void> {
  try {
    const attemptNo = await webhookRepository.recordAttempt({
      event_id: eventId,
      response_status: responseStatus,
      error_message: errorMessage,
    });
    log.debug("attempt recorded", { event_id: eventId, attempt: attemptNo, status: responseStatus });
  } catch (error: any) {
    log.error("attempt record failed", { event_id: eventId, error: error?.message });
  }
}

export async function updateWebhookService(
  id: string,
  updates: {
    mode?: "test" | "live";
    status?: "active" | "disabled";
    request_body?: any;
  }
) {
  // With request_body, `id` is a webhook_events id and only that event's body is replaced
  if (updates.request_body !== undefined) {
    return webhookRepository.updateEventRequestBody(id, updates.request_body as Prisma.InputJsonValue);
  }

  const updateData: UpdateWebhookInput = {};
  if (updates.mode) {
    updateData.mode = updates.mode;
    if (updates.mode === "live") updateData.expires_at = null;
  }
  if (updates.status) updateData.status = updates.status;

  return webhookRepository.update(id, updateData);
}
