import { ServiceM8ConnectionService } from "../modules/initgrations/serviceM8/service/serviceM8Connection.service.js";

/** Startup task: fills sm8_account_uuid for ServiceM8 connections that are still missing it. */
export const backfillSm8AccountUuids = async () => {
  const summary = await ServiceM8ConnectionService.backfillAccountUuids();
  if (summary.total === 0) {
    console.log("[Backfill] sm8_account_uuid already populated for all users — nothing to do.");
    return summary;
  }
  console.log(`[Backfill] Done — updated=${summary.updated}  failed=${summary.failed}  total=${summary.total}`);
  return summary;
};
