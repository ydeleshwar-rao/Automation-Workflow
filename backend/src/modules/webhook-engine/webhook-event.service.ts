import type { IntegrationWebhookSubscription } from "@prisma/client";
import { webhookLogger as log } from "../../utils/logger.js";
import type { WebhookEventNormalized } from "./adapters/adapter.interface.js";
import { webhookSubscriptionRepository } from "./repositories/webhook-subscription.repository.js";
import { leadshubCredentialsRepository } from "./repositories/leadshub-credentials.repository.js";
import { workflowTriggerRepository } from "../polling-engine/repositories/workflow-trigger.repository.js";
import { toJsonInput } from "../polling-engine/trigger-payload.js";

const LEADSHUB_INTEGRATION_KEY = "leadshub";
const ACTIVE_WORKFLOW_STATUS = "active";
const MISSING_WORKFLOW_STATUS = "missing";

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ─── Subscription resolution ────────────────────────────────────────────────

/** Per-subscription receiver URL (ServiceM8, Commusoft, simPRO). */
export function findSubscriptionByTargetPath(integrationKey: string, targetPath: string) {
  return webhookSubscriptionRepository.findByTargetPath(integrationKey, targetPath);
}

/**
 * OAuth-app-level receiver (GHL/Leadshub): one GHL location can have several
 * active leadshub_integrations rows (e.g. admin-impersonation flow where
 * different users connected the same location), and the latest one is not
 * necessarily the subscription owner. So collect ALL active users for the
 * location and pick the newest active subscription owned by any of them.
 */
export async function findLeadshubSubscriptionForLocation(
  locationId: string,
  eventKey: string
): Promise<IntegrationWebhookSubscription | null> {
  const userIds = await leadshubCredentialsRepository.findActiveUserIdsForLocation(locationId);
  log.info("leadshub lookup", { locationId, eventKey, candidateUsers: userIds.length, userIds });

  if (userIds.length === 0) {
    log.warn("no active leadshub_integrations rows", { locationId });
    return null;
  }

  const subscription = await webhookSubscriptionRepository.findNewestActiveForUsers({
    integrationKey: LEADSHUB_INTEGRATION_KEY,
    eventKey,
    userIds,
  });

  if (!subscription) {
    const allSubscriptions = await webhookSubscriptionRepository.findSummariesForUsers(
      LEADSHUB_INTEGRATION_KEY,
      userIds
    );
    log.warn("no subscription matched", {
      eventKey,
      userIds,
      allSubsCount: allSubscriptions.length,
      allSubs: allSubscriptions,
    });
  }
  return subscription;
}

/** User behind the newest active Leadshub connection for a location (sub-account workflow webhooks). */
export function findLeadshubUserIdForLocation(locationId: string) {
  return leadshubCredentialsRepository.findLatestActiveUserIdForLocation(locationId);
}

// ─── Event lifecycle ────────────────────────────────────────────────────────

export function findDuplicateEvent(subscriptionId: string, externalEventId: string) {
  return webhookSubscriptionRepository.findEvent(subscriptionId, externalEventId);
}

/** Logged BEFORE acknowledging the vendor — protects against retry races. */
export function logReceivedEvent(subscriptionId: string, event: WebhookEventNormalized) {
  return webhookSubscriptionRepository.createEvent({
    subscription_id: subscriptionId,
    external_event_id: event.externalId,
    event_type: event.eventType,
    payload: toJsonInput(event.data),
  });
}

/** Returns null when the workflow is active, otherwise the reason it is not runnable. */
export async function findInactiveWorkflowReason(workflowId: string): Promise<string | null> {
  const status = await workflowTriggerRepository.findWorkflowStatus(workflowId);
  if (status === ACTIVE_WORKFLOW_STATUS) return null;
  return `Workflow not active (status=${status ?? MISSING_WORKFLOW_STATUS})`;
}

/*
 * The outcome writers below run after the vendor has already been answered,
 * so a failed bookkeeping write is logged instead of thrown (nobody could catch it).
 */

export async function markEventSkipped(eventId: string, reason: string): Promise<void> {
  try {
    await webhookSubscriptionRepository.markEventFailed(eventId, reason);
  } catch (error) {
    log.error("event log update failed", { log_id: eventId, error: errorMessageOf(error) });
  }
}

export async function recordEventProcessed(eventId: string, subscriptionId: string): Promise<void> {
  try {
    await webhookSubscriptionRepository.markEventProcessed(eventId);
    await webhookSubscriptionRepository.recordDeliverySuccess(subscriptionId);
  } catch (error) {
    log.error("event bookkeeping failed", { log_id: eventId, sub: subscriptionId, error: errorMessageOf(error) });
  }
}

export async function recordEventFailed(eventId: string, subscriptionId: string, errorMessage: string): Promise<void> {
  try {
    await webhookSubscriptionRepository.markEventFailed(eventId, errorMessage);
    await webhookSubscriptionRepository.recordDeliveryFailure(subscriptionId, errorMessage);
  } catch (error) {
    log.error("event bookkeeping failed", { log_id: eventId, sub: subscriptionId, error: errorMessageOf(error) });
  }
}
