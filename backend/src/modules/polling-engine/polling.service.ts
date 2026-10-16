import { ApiError } from "../../utils/ApiError.js";
import { pollingLogger as log } from "../../utils/logger.js";
import { getAdapter } from "./adapters/adapter.registry.js";
import { getDefaultPollInterval } from "./polling.runner.js";
import {
  pollingSubscriptionRepository,
  type UpdatePollingSubscriptionInput,
} from "./repositories/polling-subscription.repository.js";
import { workflowTriggerRepository } from "./repositories/workflow-trigger.repository.js";
import { buildOutputSchema, readSubscriptionConfig, toJsonInput } from "./trigger-payload.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateSubscriptionDTO {
  workflow_id: string;
  node_id: string;
  user_id: string;
  integration_key: string;
  event_key: string;
  config?: Record<string, any>;
  poll_interval?: number;
}

export interface UpdateSubscriptionDTO {
  config?: Record<string, any>;
  poll_interval?: number;
  event_key?: string;
  is_active?: boolean;
}

const SAMPLE_PREVIEW_LIMIT = 3;

const COMMUSOFT_STAGE_EVENTS = new Set([
  "proposal_sent",
  "proposal_accepted",
  "opportunity_stage_changed",
]);

const COMMUSOFT_ESTIMATE_EVENTS = new Set([
  "estimate_sent",
  "estimate_accepted",
  "estimate_rejected",
]);

function getSyntheticSample(
  integrationKey: string,
  eventKey: string
): Record<string, any> | null {
  if (integrationKey !== "commusoft") {
    return null;
  }

  if (COMMUSOFT_ESTIMATE_EVENTS.has(eventKey)) {
    return {
      __integration: "commusoft",
      __event_key: eventKey,
      __external_id: "sample-estimate",
      commusoft_estimate_id: "sample-estimate",
      estimateId: "sample-estimate",
      estimateNumber: "EST-001",
      estimateName: "Sample Commusoft estimate",
      estimateStatus:
        eventKey === "estimate_sent"
          ? "waiting_for_customer"
          : eventKey === "estimate_accepted"
          ? "accepted"
          : "rejected",
      opportunityName: "Sample Commusoft estimate",
      customerName: "Sample Customer",
      contactName: "Sample Customer",
      firstName: "Sample",
      lastName: "Customer",
      email: "sample.customer@example.com",
      phone: "+447700900123",
      monetaryValue: 1234,
      estimateValue: 1234,
      quoteValue: 1234,
      value: 1234,
      _sampleOnly: true,
    };
  }

  if (!COMMUSOFT_STAGE_EVENTS.has(eventKey)) {
    return null;
  }

  return {
    __integration: "commusoft",
    __event_key: eventKey,
    __external_id: "sample-opportunity",
    commusoft_opportunity_id: "sample-opportunity",
    opportunityId: "sample-opportunity",
    opportunityName: "Sample Commusoft proposal",
    customerName: "Sample Customer",
    contactName: "Sample Customer",
    firstName: "Sample",
    lastName: "Customer",
    email: "sample.customer@example.com",
    phone: "+447700900123",
    monetaryValue: 1234,
    opportunityValue: 1234,
    quoteValue: 1234,
    _sampleOnly: true,
  };
}

// ─── CRUD Services ───────────────────────────────────────────────────────────

/** Idempotent on node_id — re-configuring a node updates its subscription. */
export function createPollingSubscription(dto: CreateSubscriptionDTO) {
  const pollInterval = dto.poll_interval ?? getDefaultPollInterval();
  const config = dto.config || {};

  return pollingSubscriptionRepository.upsertByNodeId(
    {
      workflow_id: dto.workflow_id,
      node_id: dto.node_id,
      user_id: dto.user_id,
      integration_key: dto.integration_key,
      event_key: dto.event_key,
      config,
      poll_interval: pollInterval,
      is_active: false, // stays inactive until workflow is activated
    },
    {
      integration_key: dto.integration_key,
      event_key: dto.event_key,
      config,
      poll_interval: pollInterval,
    }
  );
}

export function getSubscriptionByNodeId(nodeId: string) {
  return pollingSubscriptionRepository.findByNodeId(nodeId);
}

export async function getSubscriptionById(id: string) {
  const subscription = await pollingSubscriptionRepository.findById(id);
  if (!subscription) throw new ApiError(404, "Polling subscription not found");
  return subscription;
}

/** Only the fields actually sent are written (request bodies may omit any of them). */
function buildSubscriptionChanges(dto: UpdateSubscriptionDTO): UpdatePollingSubscriptionInput {
  const changes: UpdatePollingSubscriptionInput = {};
  if (dto.config !== undefined) changes.config = dto.config;
  if (dto.poll_interval !== undefined) changes.poll_interval = dto.poll_interval;
  if (dto.is_active !== undefined) changes.is_active = dto.is_active;
  if (dto.event_key) {
    // A different event means a fresh baseline: reset cursor and error state
    changes.event_key = dto.event_key;
    changes.cursor_value = null;
    changes.error_count = 0;
    changes.last_error = null;
  }
  return changes;
}

export function updatePollingSubscription(id: string, dto: UpdateSubscriptionDTO) {
  return pollingSubscriptionRepository.update(id, buildSubscriptionChanges(dto));
}

export async function deletePollingSubscription(id: string) {
  await pollingSubscriptionRepository.delete(id);
  return { message: "Subscription deleted successfully" };
}

/**
 * Manual poll — used by the Test step in the workflow builder.
 *
 * First test per subscription (cursor_value === null) ALSO seeds the
 * polling_seen_records baseline and sets cursor_value, Zapier-style:
 *   • Every record currently returned by the external API is marked "seen"
 *   • cursor_value is set to the max cursorValue
 * Result: when the workflow is activated, the cron only fires for records
 * that become new *after* the test time — no historical flood, no silent
 * first-poll bootstrap window where new jobs can get swallowed.
 *
 * Subsequent tests (cursor_value set) are pure preview — they do NOT rewrite
 * the baseline, so re-testing while configuring the workflow cannot
 * accidentally "consume" records that were supposed to fire after activation.
 */
export async function pollNowService(subscriptionId: string) {
  log.info("loading subscription", { sub: subscriptionId, step: "1/5" });
  const subscription = await getSubscriptionById(subscriptionId);
  log.info("subscription loaded", {
    step: "1/5",
    sub: subscription.id,
    integration: subscription.integration_key,
    event: subscription.event_key,
    node: subscription.node_id,
    cursor: subscription.cursor_value ?? "null",
  });

  const adapter = getAdapter(subscription.integration_key);
  if (!adapter) {
    log.error("no adapter registered", { step: "2/5", integration: subscription.integration_key });
    throw new ApiError(400, `No adapter for integration: ${subscription.integration_key}`);
  }
  log.debug("adapter resolved", { step: "2/5", integration: subscription.integration_key });

  const isFirstTest = subscription.cursor_value === null;
  const adapterConfig = {
    ...readSubscriptionConfig(subscription.config),
    _subscriptionCreatedAt: subscription.created_at.toISOString(),
  };
  let samples: Record<string, any>[] = [];

  if (isFirstTest) {
    // First test: fetch the full current list via adapter.poll(null) so we can
    // seed polling_seen_records as the baseline AND return a preview from the
    // same records (latest 3). This is the Zapier-style "turn-on baseline"
    // except we do it at test-time instead of activation-time.
    log.info("FIRST TEST: fetching all records to seed baseline", { step: "3/5", event: subscription.event_key, user: subscription.user_id });

    const pollResults = await adapter.poll(subscription.user_id, subscription.event_key, adapterConfig, null);

    log.info("records received for baseline", { step: "3/5", count: pollResults.length });

    if (pollResults.length === 0) {
      const synthetic = getSyntheticSample(subscription.integration_key, subscription.event_key);
      if (synthetic) {
        log.warn("zero live records — returning synthetic sample", { step: "3/5", integration: subscription.integration_key, event: subscription.event_key });
        return { found: true, data: [synthetic], sampleOnly: true };
      }
      log.warn("zero records from external API", { step: "3/5", event: subscription.event_key });
      return { found: false, data: [] };
    }

    // Seed baseline: mark every currently-visible record as "seen"
    await pollingSubscriptionRepository.markSeen(
      subscription.id,
      pollResults.map((pollResult) => pollResult.externalId)
    );
    log.info("baseline seeded", { rows: pollResults.length, sub: subscription.id });

    // Update cursor_value so runPollingTick no longer treats the next cron
    // tick as "first poll" (isFirstPoll === (cursor_value === null)).
    // poll() returns records sorted asc by cursorValue, so last is the max.
    const maxCursor = pollResults[pollResults.length - 1]!.cursorValue;
    await pollingSubscriptionRepository.setCursor(subscription.id, maxCursor);
    log.info("cursor_value set", { cursor: maxCursor, sub: subscription.id });

    // Preview = newest 3 raw records (poll is asc by cursor, so reverse + slice).
    samples = pollResults.slice().reverse().slice(0, SAMPLE_PREVIEW_LIMIT).map((pollResult) => pollResult.data);
  } else {
    // Subsequent test: pure preview, no state change.
    log.info("SUBSEQUENT TEST: preview only", { step: "3/5", event: subscription.event_key, sub: subscription.id });
    samples = await adapter.fetchSample(subscription.user_id, subscription.event_key, adapterConfig, SAMPLE_PREVIEW_LIMIT);

    if (!samples || samples.length === 0) {
      const synthetic = getSyntheticSample(subscription.integration_key, subscription.event_key);
      if (synthetic) {
        log.warn("zero live records — returning synthetic sample", { step: "3/5", integration: subscription.integration_key, event: subscription.event_key });
        return { found: true, data: [synthetic], sampleOnly: true };
      }
      log.warn("no records returned", { step: "3/5", event: subscription.event_key });
      return { found: false, data: [] };
    }
    log.info("samples received", { step: "3/5", count: samples.length, sub: subscription.id });
  }

  // Schema is derived from the first record (used by the field-mapper UI).
  const schemaSource = samples[0]!;

  log.debug("building output schema", { step: "4/5", node: subscription.node_id });
  const outputSchema = buildOutputSchema(schemaSource);
  log.debug("schema built", { step: "4/5", fields: Object.keys(outputSchema).length });
  log.debug("persisting sample_payload", { step: "5/5", node: subscription.node_id });

  // A failed sample save must not fail the Test step — the samples are still returned.
  try {
    await workflowTriggerRepository.saveNodeSample(subscription.node_id, toJsonInput(schemaSource), outputSchema);
    log.info("sample_payload saved", { step: "5/5", node: subscription.node_id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("failed to persist sample_payload", { step: "5/5", node: subscription.node_id, error: errorMessage });
  }

  return { found: true, data: samples, baselineSeeded: isFirstTest };
}

/**
 * Get subscription status — returns polling health info.
 */
export async function getSubscriptionStatus(id: string) {
  const subscription = await getSubscriptionById(id);
  const totalSeenRecords = await pollingSubscriptionRepository.countSeenRecords(id);

  return {
    id: subscription.id,
    is_active: subscription.is_active,
    last_polled_at: subscription.last_polled_at,
    cursor_value: subscription.cursor_value,
    error_count: subscription.error_count,
    last_error: subscription.last_error,
    total_seen_records: totalSeenRecords,
  };
}
