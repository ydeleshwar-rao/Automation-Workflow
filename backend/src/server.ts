import "./config/env.config.js";
import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 30; // prevent MaxListenersExceededWarning from TLS/HTTPS pools
import app from "./app.js";
import prisma from "./lib/prisma.js";
import { startAutoRefreshJob } from "./jobs/autoRefreshJob.js";
import { startPollingJob } from "./modules/polling-engine/polling.job.js";
import { backfillSm8AccountUuids } from "./jobs/backfillSm8AccountUuid.js";
import { restoreAllSessions } from "./modules/initgrations/whatsapp/session/session.manager.js";

const PORT = process.env.PORT;

async function startServer() {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Start background jobs
    startAutoRefreshJob();
    startPollingJob();

    // One-time migration: populate sm8_account_uuid for existing users
    backfillSm8AccountUuids().catch((error) =>
      console.error("[Backfill] sm8_account_uuid migration failed:", error?.message)
    );

    // Restore WhatsApp sessions for users who were connected before restart
    restoreAllSessions().catch((error) =>
      console.error("[WA Engine] Session restore failed:", error?.message)
    );
  });
}
startServer();

/** Close the database pool cleanly when the process is stopped. */
async function shutdown(signal: NodeJS.Signals) {
  console.log(`${signal} received — closing database connections`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
