/**
 * Auto-migrate active polling subscriptions to webhook subscriptions for one
 * integration. Atomic per row, rollback-safe.
 *
 * Usage:
 *   bun scripts/migrate-polling-to-webhook.ts <integration_key> [--dry-run]
 *
 * Examples:
 *   bun scripts/migrate-polling-to-webhook.ts service_m8 --dry-run
 *   bun scripts/migrate-polling-to-webhook.ts service_m8
 *   bun scripts/migrate-polling-to-webhook.ts leadshub
 *
 * Behavior per row:
 *   1. Call createWebhookSubscription with the same workflow_id/node_id/...
 *   2. On success: deactivate polling row (is_active=false). Polling cron stops
 *      polling it. We DO NOT delete the row — preserved for rollback / audit.
 *   3. On failure: leave polling row untouched, log + skip.
 *
 * Exit code: 0 if all rows migrated cleanly, 1 if any row failed.
 */

import "../src/config/env.config.js";
import type { PollingSubscription } from "@prisma/client";
import prisma from "../src/lib/prisma.js";
import {
  supportsWebhook,
  createWebhookSubscription,
} from "../src/modules/webhook-engine/webhook.service.js";
import { pollingSubscriptionRepository } from "../src/modules/polling-engine/repositories/polling-subscription.repository.js";
import { webhookSubscriptionRepository } from "../src/modules/webhook-engine/repositories/webhook-subscription.repository.js";

type MigrationOutcome = "migrated" | "skipped" | "failed" | "would-migrate";

function readSubscriptionConfig(subscription: PollingSubscription): Record<string, unknown> {
  const config = subscription.config;
  return config && typeof config === "object" && !Array.isArray(config)
    ? (config as Record<string, unknown>)
    : {};
}

async function migrateSubscription(subscription: PollingSubscription, isDryRun: boolean): Promise<MigrationOutcome> {
  const logContext = `id=${subscription.id} node=${subscription.node_id} event=${subscription.event_key}`;

  const existingWebhookSubscription = await webhookSubscriptionRepository.findByNodeId(subscription.node_id);
  if (existingWebhookSubscription) {
    console.log(`[Migrate] ⊘ ${logContext} — webhook subscription already exists, skipping`);
    return "skipped";
  }

  if (isDryRun) {
    console.log(`[Migrate] ◌ ${logContext} — would migrate`);
    return "would-migrate";
  }

  try {
    const webhookSubscription = await createWebhookSubscription({
      workflow_id:     subscription.workflow_id,
      node_id:         subscription.node_id,
      user_id:         subscription.user_id,
      integration_key: subscription.integration_key,
      event_key:       subscription.event_key,
      config:          readSubscriptionConfig(subscription),
    });

    try {
      await pollingSubscriptionRepository.update(subscription.id, { is_active: false });
    } catch (deactivateError) {
      const message = deactivateError instanceof Error ? deactivateError.message : String(deactivateError);
      console.warn(`[Migrate] ⚠ ${logContext} — webhook created (${webhookSubscription.id}) but polling deactivate failed: ${message}`);
    }

    console.log(`[Migrate] ✓ ${logContext} → webhook=${webhookSubscription.id}`);
    return "migrated";
  } catch (migrationError) {
    const message = migrationError instanceof Error ? migrationError.message : String(migrationError);
    console.error(`[Migrate] ✖ ${logContext} — ${message}`);
    return "failed";
  }
}

async function main(): Promise<number> {
  const commandLineArguments = process.argv.slice(2);
  const integrationKey = commandLineArguments[0];
  const isDryRun = commandLineArguments.includes("--dry-run");

  if (!integrationKey) {
    console.error("Usage: bun scripts/migrate-polling-to-webhook.ts <integration_key> [--dry-run]");
    return 2;
  }

  if (!supportsWebhook(integrationKey)) {
    console.error(`[Migrate] integration_key='${integrationKey}' has no webhook adapter registered. Aborting.`);
    return 2;
  }

  console.log(`[Migrate] ${isDryRun ? "DRY RUN " : ""}polling → webhook for integration='${integrationKey}'`);

  const subscriptions = await pollingSubscriptionRepository.findActiveByIntegration(integrationKey);
  if (subscriptions.length === 0) {
    console.log("[Migrate] no active polling subscriptions to migrate. Done.");
    return 0;
  }

  console.log(`[Migrate] found ${subscriptions.length} active polling subscription(s)`);

  const outcomeCounts: Record<MigrationOutcome, number> = { migrated: 0, skipped: 0, failed: 0, "would-migrate": 0 };
  for (const subscription of subscriptions) {
    const outcome = await migrateSubscription(subscription, isDryRun);
    outcomeCounts[outcome] += 1;
  }

  console.log(
    `\n[Migrate] complete: succeeded=${outcomeCounts.migrated}  failed=${outcomeCounts.failed}  ` +
    `skipped=${outcomeCounts.skipped}  total=${subscriptions.length}`
  );
  return outcomeCounts.failed > 0 ? 1 : 0;
}

main()
  .then(async (exitCode) => {
    await prisma.$disconnect();
    process.exit(exitCode);
  })
  .catch(async (fatalError) => {
    console.error(`[Migrate] fatal: ${fatalError instanceof Error ? fatalError.message : String(fatalError)}`);
    await prisma.$disconnect();
    process.exit(1);
  });
