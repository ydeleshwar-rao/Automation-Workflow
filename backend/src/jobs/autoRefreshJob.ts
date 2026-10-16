import cron from "node-cron";
import type { Servicem8Integration } from "@prisma/client";
import { servicem8IntegrationRepository } from "../modules/initgrations/serviceM8/repositories/servicem8-integration.repository.js";
import { refreshAccessToken } from "../modules/initgrations/serviceM8/utils/refreshAccessToken.js";

const EVERY_THIRTY_MINUTES = "*/30 * * * *";
// Refresh when the access token has expired or expires within this window
const REFRESH_WINDOW_MINUTES = 10;
const MILLISECONDS_PER_MINUTE = 60 * 1000;

/**
 * Only one connection per ServiceM8 account is refreshed: refreshAccessToken copies the new
 * tokens to siblings, and refreshing two siblings races on ServiceM8's refresh-token rotation
 * (the second attempt fails and wrongly flags needs_reauth).
 */
const selectConnectionsToRefresh = (connections: Servicem8Integration[], refreshBefore: Date) => {
  const queuedAccounts = new Set<string>();
  return connections.filter((connection) => {
    if (connection.needs_reauth) return false;
    if (connection.expires_at && connection.expires_at > refreshBefore) return false;

    const accountKey = connection.sm8_account_uuid ?? connection.user_id;
    if (queuedAccounts.has(accountKey)) {
      console.log(`[ServiceM8 Job] Skipping sibling user ${connection.user_id} (account ${accountKey} already queued)`);
      return false;
    }
    queuedAccounts.add(accountKey);
    return true;
  });
};

const refreshConnections = async (connections: Servicem8Integration[]) => {
  let successCount = 0;
  let failCount = 0;
  for (const connection of connections) {
    try {
      await refreshAccessToken(connection.user_id, connection.refresh_token);
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`[ServiceM8 Job] Failed for user ${connection.user_id}:`, error);
    }
  }
  return { successCount, failCount };
};

const runJob = async () => {
  const startedAt = Date.now();
  const refreshBefore = new Date(startedAt + REFRESH_WINDOW_MINUTES * MILLISECONDS_PER_MINUTE);

  const connections = await servicem8IntegrationRepository.findRefreshableConnections();
  if (connections.length === 0) {
    console.log("[ServiceM8 Job] No active ServiceM8 connections found.");
    return;
  }

  const connectionsToRefresh = selectConnectionsToRefresh(connections, refreshBefore);
  const awaitingReconnect = connections.filter((connection) => connection.needs_reauth);
  if (awaitingReconnect.length > 0) {
    console.warn(`[ServiceM8 Job] Users awaiting manual reconnect: ${awaitingReconnect.map((connection) => connection.user_id).join(", ")}`);
  }
  if (connectionsToRefresh.length === 0) return;

  const { successCount, failCount } = await refreshConnections(connectionsToRefresh);
  console.log(
    `[ServiceM8 Job] Sweep complete — refreshed=${successCount}  failed=${failCount}  duration=${Date.now() - startedAt}ms`
  );
};

// Silently refreshes access tokens before they expire
export const startAutoRefreshJob = () => {
  cron.schedule(EVERY_THIRTY_MINUTES, async () => {
    await runJob().catch((error) => console.error("[ServiceM8 Job] Sweep failed:", error));
  });

  console.log("[ServiceM8 Job] Auto-refresh cron registered — runs every 30 minutes");

  // Also run immediately on startup to catch any stale tokens right away
  runJob().catch((error) => console.error("[ServiceM8 Job] Startup run failed:", error));
};
