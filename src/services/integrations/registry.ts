import type { AppId } from "@/src/store/appStatusSlice";
import type { JobsDataProvider } from "./types";
import { servicem8Provider } from "./servicem8.provider";
import { commusoftProvider } from "./commusoft.provider";

/**
 * Adapter registry. Add a new integration by importing its provider here
 * and slotting it into the map — no DashboardOverview changes required.
 *
 * SimPro / LeadsHub providers can be added the same way once their backend
 * `/getalljobs` endpoints are finalised.
 */
const PROVIDERS: Partial<Record<AppId, JobsDataProvider>> = {
  servicem8: servicem8Provider,
  commusoft: commusoftProvider,
  // simpro:   simproProvider,    // TODO: add when /api/integration/simpro/jobs is ready
  // leadshub: leadshubProvider,  // (LeadsHub doesn't track jobs in the same sense)
};

export const getJobsProvider = (appId: AppId | null): JobsDataProvider | null =>
  appId ? PROVIDERS[appId] ?? null : null;

export const listAvailableProviders = (): JobsDataProvider[] =>
  Object.values(PROVIDERS).filter(
    (p): p is JobsDataProvider => p !== undefined,
  );
