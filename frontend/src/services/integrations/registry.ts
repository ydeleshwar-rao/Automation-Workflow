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
const PROVIDERS = {
  servicem8: servicem8Provider,
  commusoft: commusoftProvider,
} satisfies Partial<Record<AppId, JobsDataProvider>>;

/** Apps that have a registered jobs provider — the only valid keys for a jobs query. */
export type JobsProviderAppId = keyof typeof PROVIDERS;

export const isJobsProviderAppId = (appId: AppId | null): appId is JobsProviderAppId =>
  appId !== null && appId in PROVIDERS;

export const getRegisteredJobsProvider = (appId: JobsProviderAppId): JobsDataProvider =>
  PROVIDERS[appId];

export const listAvailableProviders = (): JobsDataProvider[] => Object.values(PROVIDERS);
