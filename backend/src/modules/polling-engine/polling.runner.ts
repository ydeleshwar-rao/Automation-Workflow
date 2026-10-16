import type { PollingSubscription } from "@prisma/client";
import { getAdapter } from "./adapters/adapter.registry.js";
import type { PollResult } from "./adapters/adapter.interface.js";
import { executeWorkflow } from "../workflow-automation/processor/webhookProcessor.js";
import { pollingLogger as log } from "../../utils/logger.js";
import { pollingSubscriptionRepository } from "./repositories/polling-subscription.repository.js";
import { workflowTriggerRepository } from "./repositories/workflow-trigger.repository.js";
import { readSubscriptionConfig } from "./trigger-payload.js";

const MAX_ERROR_COUNT = 5;
const DEFAULT_POLL_INTERVAL_SECONDS = 300;
const MIN_POLL_INTERVAL_SECONDS = 60;
const MILLISECONDS_PER_SECOND = 1000;
// ServiceM8 auto-poll paused — use poll-now manually
const AUTO_POLL_EXCLUDED_INTEGRATIONS = ["service_m8"];

/**
 * Returns true if current time is inside the quiet window defined by
 * POLL_QUIET_START and POLL_QUIET_END env vars (both 0-23 hour values).
 *
 * Examples:
 *   POLL_QUIET_START=23  POLL_QUIET_END=6   → quiet from 11 PM to 6 AM (crosses midnight)
 *   POLL_QUIET_START=2   POLL_QUIET_END=5   → quiet from 2 AM to 5 AM (same day)
 *
 * If either var is missing/invalid, quiet hours are disabled.
 */
function isQuietHour(): boolean {
  const startHour = parseInt(process.env.POLL_QUIET_START ?? "", 10);
  const endHour = parseInt(process.env.POLL_QUIET_END ?? "", 10);

  if (isNaN(startHour) || isNaN(endHour)) return false;

  const currentHour = new Date().getHours();

  // Crosses midnight (e.g. 23 → 6)
  if (startHour > endHour) {
    return currentHour >= startHour || currentHour < endHour;
  }
  // Same day window (e.g. 2 → 5)
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Default poll interval for new subscriptions — from POLL_DEFAULT_INTERVAL env
 * (seconds). Falls back to 300 (5 min) if not set.
 */
export function getDefaultPollInterval(): number {
  const configuredInterval = parseInt(process.env.POLL_DEFAULT_INTERVAL ?? "", 10);
  return isNaN(configuredInterval) || configuredInterval < MIN_POLL_INTERVAL_SECONDS
    ? DEFAULT_POLL_INTERVAL_SECONDS
    : configuredInterval;
}

function isDueForPoll(subscription: PollingSubscription, now: number): boolean {
  if (!subscription.last_polled_at) return true;
  const intervalMs = (subscription.poll_interval || DEFAULT_POLL_INTERVAL_SECONDS) * MILLISECONDS_PER_SECOND;
  return now - subscription.last_polled_at.getTime() >= intervalMs;
}

/**
 * Fetch all subscriptions that are due for polling.
 * A subscription is "due" if:
 *   - is_active = true
 *   - error_count < MAX_ERROR_COUNT
 *   - last_polled_at is null OR (now - last_polled_at) >= poll_interval seconds
 */
async function getDueSubscriptions(): Promise<PollingSubscription[]> {
  const now = Date.now();
  const candidates = await pollingSubscriptionRepository.findDue({
    maxErrorCount: MAX_ERROR_COUNT,
    excludedIntegrationKeys: AUTO_POLL_EXCLUDED_INTEGRATIONS,
    polledBefore: new Date(now - MIN_POLL_INTERVAL_SECONDS * MILLISECONDS_PER_SECOND),
  });
  // The query uses the minimum interval; custom intervals > 60s are checked here.
  return candidates.filter((subscription) => isDueForPoll(subscription, now));
}

interface SubscriptionResult {
  subscriptionId: string;
  status: "ok" | "skipped" | "error";
  polled: number;
  seeded: number;
  triggered: number;
  error?: string;
}

function emptyResult(subscriptionId: string, status: SubscriptionResult["status"]): SubscriptionResult {
  return { subscriptionId, status, polled: 0, seeded: 0, triggered: 0 };
}

/** Newest cursor among the records (cursors sort lexicographically: ISO dates / padded ids). */
function findMaxCursor(records: PollResult[]): string | undefined {
  return records
    .map((record) => record.cursorValue)
    .filter((cursorValue) => cursorValue && cursorValue !== "")
    .sort()
    .pop();
}

function collectExternalIds(records: PollResult[]): string[] {
  const externalIds = records
    .flatMap((record) => [record.externalId, record.data?.__legacy_external_id])
    .filter(Boolean);
  return [...new Set(externalIds)];
}

function selectNewRecords(records: PollResult[], seenExternalIds: Set<string>): PollResult[] {
  return records.filter((record) => {
    if (seenExternalIds.has(record.externalId)) return false;

    // Compatibility for proposal subscriptions created before proposal events
    // used versioned IDs. Suppress only the initial sent marker if the old
    // opportunity ID was already seen; later versions still trigger.
    const legacyId = record.data?.__legacy_external_id;
    const isInitialProposalSentId = legacyId && record.externalId === `${legacyId}:proposal_sent:1`;
    return !(isInitialProposalSentId && seenExternalIds.has(legacyId));
  });
}

/**
 * First poll bootstrap: seed seen records + cursor, but DON'T trigger workflows.
 */
async function seedFirstPoll(
  subscription: PollingSubscription,
  records: PollResult[],
  polledAt: Date,
  tickId: string
): Promise<SubscriptionResult> {
  log.info("FIRST POLL — seeding without triggering", {
    tickId,
    subId: subscription.id,
    integration: subscription.integration_key,
    event: subscription.event_key,
    count: records.length,
  });

  await pollingSubscriptionRepository.markSeen(
    subscription.id,
    records.map((record) => record.externalId)
  );

  const forcedCursor = findMaxCursor(records) ?? new Date().toISOString();
  await pollingSubscriptionRepository.recordPollSuccess(subscription.id, polledAt, forcedCursor);

  log.info("first poll complete", {
    tickId,
    subId: subscription.id,
    seeded: records.length,
    cursor: forcedCursor,
  });

  return { subscriptionId: subscription.id, status: "ok", polled: records.length, seeded: records.length, triggered: 0 };
}

/** Normal poll: mark each new record seen, then trigger its workflow run. */
async function triggerNewRecords(
  subscription: PollingSubscription,
  newRecords: PollResult[],
  tickId: string
): Promise<number> {
  if (newRecords.length === 0) {
    log.info("no new records — nothing to trigger", { tickId, subId: subscription.id });
  }

  let triggered = 0;
  for (const record of newRecords) {
    // Mark as seen FIRST to prevent duplicate triggers
    await pollingSubscriptionRepository.markSeen(subscription.id, [record.externalId]);

    log.info("triggering workflow", {
      tickId,
      subId: subscription.id,
      workflowId: subscription.workflow_id,
      record: record.externalId,
    });

    executeWorkflow(subscription.workflow_id, record.data).catch((error) => {
      log.error("workflow execution failed", {
        tickId,
        subId: subscription.id,
        workflowId: subscription.workflow_id,
        record: record.externalId,
        error: error.message,
      });
    });

    triggered++;
  }
  return triggered;
}

async function recordFailure(
  subscription: PollingSubscription,
  polledAt: Date,
  errorMessage: string,
  tickId: string
): Promise<void> {
  try {
    await pollingSubscriptionRepository.recordPollFailure(subscription.id, polledAt, errorMessage);
  } catch (error) {
    // Losing the error state must not abort the rest of the tick.
    log.error("failed to persist error state", {
      tickId,
      subId: subscription.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Process a single subscription: poll the adapter, deduplicate, trigger workflows.
 */
async function processSubscription(
  subscription: PollingSubscription,
  tickId: string
): Promise<SubscriptionResult> {
  const polledAt = new Date();
  const startedAt = Date.now();

  // 1. Verify workflow is still active
  if (!(await workflowTriggerRepository.isWorkflowActive(subscription.workflow_id))) {
    log.info("workflow not active — skipping", {
      tickId,
      subId: subscription.id,
      integration: subscription.integration_key,
      event: subscription.event_key,
      workflowId: subscription.workflow_id,
    });
    return emptyResult(subscription.id, "skipped");
  }

  // 2. Get the adapter
  const adapter = getAdapter(subscription.integration_key);
  if (!adapter) {
    const errorMessage = `No adapter registered for integration: ${subscription.integration_key}`;
    log.error("no adapter registered", {
      tickId,
      subId: subscription.id,
      integration: subscription.integration_key,
      error: errorMessage,
    });
    await recordFailure(subscription, polledAt, errorMessage, tickId);
    return { ...emptyResult(subscription.id, "error"), error: errorMessage };
  }

  try {
    // 3. Poll the external API
    const adapterConfig = {
      ...readSubscriptionConfig(subscription.config),
      _subscriptionCreatedAt: subscription.created_at.toISOString(),
    };
    const records = await adapter.poll(
      subscription.user_id,
      subscription.event_key,
      adapterConfig,
      subscription.cursor_value
    );

    log.info("polled records", {
      tickId,
      subId: subscription.id,
      integration: subscription.integration_key,
      event: subscription.event_key,
      polled: records.length,
      adapter_duration_ms: Date.now() - startedAt,
    });

    if (records.length === 0) {
      await pollingSubscriptionRepository.recordPollSuccess(subscription.id, polledAt);
      log.info("no records — marked polled, no trigger", {
        tickId,
        subId: subscription.id,
        duration_ms: Date.now() - startedAt,
      });
      return emptyResult(subscription.id, "ok");
    }

    // 4. Deduplicate against seen records
    const externalIds = collectExternalIds(records);
    const seenExternalIds = await pollingSubscriptionRepository.findSeenExternalIds(subscription.id, externalIds);
    const newRecords = selectNewRecords(records, seenExternalIds);

    log.debug("dedup", {
      tickId,
      subId: subscription.id,
      externalIds,
      already_seen: [...seenExternalIds],
      new_records: newRecords.map((record) => record.externalId),
      polled: records.length,
      new: newRecords.length,
    });

    // 5. First poll bootstrap — exit without triggering workflows
    if (subscription.cursor_value === null) {
      return await seedFirstPoll(subscription, records, polledAt, tickId);
    }

    // 6. Normal poll: trigger workflows for new records
    const triggered = await triggerNewRecords(subscription, newRecords, tickId);

    // 7. Update cursor to the sorted maximum value
    const maxCursor = findMaxCursor(records) ?? subscription.cursor_value;
    await pollingSubscriptionRepository.recordPollSuccess(subscription.id, polledAt, maxCursor);

    log.info("subscription done", {
      tickId,
      subId: subscription.id,
      integration: subscription.integration_key,
      event: subscription.event_key,
      polled: records.length,
      seeded: 0,
      triggered,
      cursor: maxCursor,
      duration_ms: Date.now() - startedAt,
    });
    return { subscriptionId: subscription.id, status: "ok", polled: records.length, seeded: 0, triggered };
  } catch (error) {
    const errorMessage = (error instanceof Error && error.message) || "Unknown error";
    log.error("processing failed", {
      tickId,
      subId: subscription.id,
      integration: subscription.integration_key,
      event: subscription.event_key,
      error: errorMessage,
      error_count: subscription.error_count + 1,
      max: MAX_ERROR_COUNT,
      duration_ms: Date.now() - startedAt,
    });

    await recordFailure(subscription, polledAt, errorMessage, tickId);

    if (subscription.error_count + 1 >= MAX_ERROR_COUNT) {
      log.error("MAX_ERROR_COUNT reached — subscription will be skipped", {
        tickId,
        subId: subscription.id,
        max: MAX_ERROR_COUNT,
      });
    }

    return { ...emptyResult(subscription.id, "error"), error: errorMessage };
  }
}

/**
 * Short correlation ID for grouping all log lines emitted in a single tick.
 * Format: t<base36-timestamp-tail>  e.g. "t1k3b2f7"
 */
function newTickId(): string {
  return "t" + Date.now().toString(36).slice(-6);
}

function logTickSummary(tickId: string, results: SubscriptionResult[], tickStart: number): void {
  const sumOf = (field: "polled" | "triggered" | "seeded") =>
    results.reduce((total, result) => total + result[field], 0);
  const countWithStatus = (status: SubscriptionResult["status"]) =>
    results.filter((result) => result.status === status).length;

  log.info("tick complete", {
    tickId,
    subs: results.length,
    ok: countWithStatus("ok"),
    skipped: countWithStatus("skipped"),
    errors: countWithStatus("error"),
    polled: sumOf("polled"),
    seeded: sumOf("seeded"),
    triggered: sumOf("triggered"),
    duration_ms: Date.now() - tickStart,
  });

  for (const failedResult of results.filter((result) => result.status === "error")) {
    log.error("failed subscription", { tickId, subId: failedResult.subscriptionId, error: failedResult.error });
  }
}

/**
 * Main polling tick — called by the cron job every 60 seconds.
 * Fetches all due subscriptions and processes them.
 */
export async function runPollingTick(): Promise<void> {
  const tickId = newTickId();
  const tickStart = Date.now();

  if (isQuietHour()) {
    const { POLL_QUIET_START, POLL_QUIET_END } = process.env;
    log.info("quiet hours active — skipping tick", {
      tickId,
      quietStart: POLL_QUIET_START,
      quietEnd: POLL_QUIET_END,
    });
    return;
  }

  let dueSubscriptions: PollingSubscription[];
  try {
    dueSubscriptions = await getDueSubscriptions();
  } catch (error) {
    log.error("failed to fetch due subscriptions", {
      tickId,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  if (dueSubscriptions.length === 0) {
    log.debug("idle — no due subscriptions", { tickId });
    return;
  }

  log.info("processing due subscriptions", {
    tickId,
    count: dueSubscriptions.length,
    ids: dueSubscriptions.map((subscription) => subscription.id),
  });

  // Process subscriptions sequentially to avoid overwhelming external APIs
  const results: SubscriptionResult[] = [];
  for (const subscription of dueSubscriptions) {
    results.push(await processSubscription(subscription, tickId));
  }

  logTickSummary(tickId, results, tickStart);
}
