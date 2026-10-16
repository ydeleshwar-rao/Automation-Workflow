import crypto from "crypto";
import { buildPublicApiUrl } from "../../config/api.config.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  getWebhookAdapter,
  supportsWebhook,
} from "./adapters/adapter.registry.js";
import type { WebhookAdapter } from "./adapters/adapter.interface.js";
import { fetchLeadshubWebhookSample } from "./adapters/leadshub.webhook.adapter.js";
import { getAdapter as getPollingAdapter } from "../polling-engine/adapters/adapter.registry.js";
import { pollingSubscriptionRepository } from "../polling-engine/repositories/polling-subscription.repository.js";
import { workflowTriggerRepository } from "../polling-engine/repositories/workflow-trigger.repository.js";
import {
  buildOutputSchema,
  readSubscriptionConfig,
  toJsonInput,
  type TriggerRecord,
} from "../polling-engine/trigger-payload.js";
import { webhookSubscriptionRepository } from "./repositories/webhook-subscription.repository.js";

// ─── Config ─────────────────────────────────────────────────────────────────
// Receiver URLs are built from PUBLIC_BASE_URL / BASE_URL (config/api.config.ts).
const TARGET_PATH_RANDOM_BYTES = 16;
const SAMPLE_PREVIEW_LIMIT = 3;

function buildReceiverUrl(integrationKey: string, targetPath: string): string {
  return buildPublicApiUrl(`/webhooks-receiver/integrations/${integrationKey}/${targetPath}`);
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Vendor-side cleanup is best effort: a failed unsubscribe must not block our own change. */
async function unsubscribeQuietly(
  adapter: WebhookAdapter,
  userId: string,
  externalSubscriptionId: string,
  context: string
): Promise<void> {
  try {
    await adapter.unsubscribe(userId, externalSubscriptionId);
  } catch (error) {
    console.warn(`[WebhookService] vendor unsubscribe (${context}) failed: ${errorMessageOf(error)}`);
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────
export interface CreateWebhookSubscriptionDTO {
  workflow_id: string;
  node_id: string;
  user_id: string;
  integration_key: string;
  event_key: string;
  config?: Record<string, any>;
}

// ─── CRUD ───────────────────────────────────────────────────────────────────
export async function createWebhookSubscription(dto: CreateWebhookSubscriptionDTO) {
  const adapter = getWebhookAdapter(dto.integration_key);
  if (!adapter) {
    throw new ApiError(
      400,
      `No webhook adapter for integration: ${dto.integration_key}`
    );
  }

  const config = dto.config || {};

  // Idempotent on node_id — update existing row instead of duplicating
  const existing = await webhookSubscriptionRepository.findByNodeId(dto.node_id);

  if (existing) {
    // Event/config may have changed — unsubscribe old and re-subscribe fresh
    if (existing.external_subscription_id) {
      await unsubscribeQuietly(adapter, dto.user_id, existing.external_subscription_id, "existing");
    }

    // Reuse the stable target path so the vendor-facing URL does not change
    const { externalSubscriptionId, signingSecret } = await adapter.subscribe(
      dto.user_id,
      dto.event_key,
      buildReceiverUrl(dto.integration_key, existing.target_path),
      config
    );

    return webhookSubscriptionRepository.resubscribe(existing.id, {
      integration_key: dto.integration_key,
      event_key: dto.event_key,
      config,
      external_subscription_id: externalSubscriptionId,
      signing_secret: signingSecret,
    });
  }

  // Fresh subscription
  const targetPath = `sub_${crypto.randomBytes(TARGET_PATH_RANDOM_BYTES).toString("hex")}`;
  const { externalSubscriptionId, signingSecret } = await adapter.subscribe(
    dto.user_id,
    dto.event_key,
    buildReceiverUrl(dto.integration_key, targetPath),
    config
  );

  let subscription;
  try {
    subscription = await webhookSubscriptionRepository.create({
      workflow_id: dto.workflow_id,
      node_id: dto.node_id,
      user_id: dto.user_id,
      integration_key: dto.integration_key,
      event_key: dto.event_key,
      config,
      external_subscription_id: externalSubscriptionId,
      target_path: targetPath,
      signing_secret: signingSecret,
    });
  } catch (error) {
    // Rollback vendor side if DB insert failed
    if (externalSubscriptionId) {
      await unsubscribeQuietly(adapter, dto.user_id, externalSubscriptionId, "rollback");
    }
    throw error;
  }

  await deactivateSiblingPollingSubscription(dto.node_id);
  return subscription;
}

/**
 * Belt-and-suspenders: if a polling subscription exists for this same node
 * (from a previous failed webhook attempt or pre-migration), deactivate it
 * so the polling cron stops firing — otherwise the workflow would trigger
 * twice for every event (once via webhook, once via polling).
 * Failure is only logged: the webhook subscription itself already succeeded.
 */
async function deactivateSiblingPollingSubscription(nodeId: string): Promise<void> {
  try {
    await pollingSubscriptionRepository.deactivateActiveByNodeId(nodeId);
  } catch (error) {
    console.warn(
      `[WebhookService] could not deactivate sibling polling sub for node=${nodeId}: ${errorMessageOf(error)}`
    );
  }
}

/** Returns null when not found — callers use it to detect webhook vs polling ids. */
export function getWebhookSubscriptionById(id: string) {
  return webhookSubscriptionRepository.findById(id);
}

export function getWebhookSubscriptionByNodeId(nodeId: string) {
  return webhookSubscriptionRepository.findByNodeId(nodeId);
}

export async function deleteWebhookSubscription(id: string) {
  const subscription = await getWebhookSubscriptionById(id);
  if (!subscription) return { message: "Webhook subscription not found" };

  const adapter = getWebhookAdapter(subscription.integration_key);
  if (adapter && subscription.external_subscription_id) {
    await unsubscribeQuietly(
      adapter,
      subscription.user_id,
      subscription.external_subscription_id,
      "proceeding with DB delete"
    );
  }

  await webhookSubscriptionRepository.delete(id);
  return { message: "Webhook subscription deleted successfully" };
}

export function setWebhookSubscriptionActive(id: string, isActive: boolean) {
  return webhookSubscriptionRepository.setActive(id, isActive);
}

// ─── Test step support ──────────────────────────────────────────────────────
async function fetchWebhookTestSamples(
  integrationKey: string,
  userId: string,
  eventKey: string,
  config: TriggerRecord
): Promise<Record<string, any>[]> {
  if (integrationKey === "leadshub") {
    return fetchLeadshubWebhookSample(userId, eventKey, config, SAMPLE_PREVIEW_LIMIT);
  }

  if (integrationKey === "service_m8" || integrationKey === "simpro") {
    const pollingAdapter = getPollingAdapter(integrationKey);
    if (!pollingAdapter) {
      throw new ApiError(500, `${integrationKey} polling adapter not registered`);
    }
    return pollingAdapter.fetchSample(userId, eventKey, config, SAMPLE_PREVIEW_LIMIT);
  }

  throw new ApiError(
    400,
    `Webhook test-sample not implemented for integration: ${integrationKey}`
  );
}

/**
 * Sample-fetching for the workflow builder's "Test" step. Webhook subscriptions
 * have no historical buffer — vendors only push *future* events. So for the
 * test step we still need a REST API call, but we own that call inside the
 * webhook adapter (no dependency on the polling adapter). The sample is
 * enriched through the same pipeline real webhooks use, so the field-mapping
 * UI sees identical keys for both Test clicks and real GHL pushes.
 *
 * Leadshub has its own webhook-side sample fetcher. ServiceM8 and simPRO reuse
 * the polling adapter's fetchSample() — both paths apply the same enrichment,
 * so the mapping UI sees identical keys to what the live webhook will deliver.
 *
 * Same response shape as polling-engine's pollNowService result.
 */
export async function pollNowForWebhookSubscription(webhookSubId: string) {
  const subscription = await getWebhookSubscriptionById(webhookSubId);
  if (!subscription) throw new ApiError(404, "Webhook subscription not found");

  const samples = await fetchWebhookTestSamples(
    subscription.integration_key,
    subscription.user_id,
    subscription.event_key,
    readSubscriptionConfig(subscription.config)
  );

  if (!samples || samples.length === 0) {
    return { found: false, data: [] };
  }

  // Persist sample_payload + output_schema on the workflow node — matches what
  // polling-engine's pollNowService does so the field-mapper UI keeps working.
  // A failed save must not fail the Test step: the samples are still returned.
  const schemaSource = samples[0]!;
  try {
    await workflowTriggerRepository.saveNodeSample(
      subscription.node_id,
      toJsonInput(schemaSource),
      buildOutputSchema(schemaSource)
    );
  } catch (error) {
    console.error(
      `[WebhookService:pollNow] failed to persist sample_payload node=${subscription.node_id} error=${errorMessageOf(error)}`
    );
  }

  return { found: true, data: samples };
}

// ─── Status ─────────────────────────────────────────────────────────────────
export async function getWebhookSubscriptionStatus(id: string) {
  const subscription = await getWebhookSubscriptionById(id);
  if (!subscription) throw new ApiError(404, "Webhook subscription not found");

  const totalEventsLogged = await webhookSubscriptionRepository.countEvents(id);

  return {
    id:                  subscription.id,
    delivery_mode:       "webhook",
    is_active:           subscription.is_active,
    last_received_at:    subscription.last_received_at,
    total_received:      subscription.total_received,
    error_count:         subscription.error_count,
    last_error:          subscription.last_error,
    total_events_logged: totalEventsLogged,
  };
}

// Re-export the registry's gate function so external modules don't need to
// reach into the adapters folder.
export { supportsWebhook };
