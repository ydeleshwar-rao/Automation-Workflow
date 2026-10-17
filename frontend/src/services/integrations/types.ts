import type { JobsFilters, NormalizedJob } from "@/src/types/dashboard.types";
import type { AppId } from "@/src/store/appStatusSlice";

/** The HTTP request a provider needs; RTK Query sends it through the shared base query. */
export interface JobsRequest {
  url: string;
  params: Record<string, string>;
}

/**
 * Contract every integration must satisfy to plug into the dashboard.
 *
 * Providers are pure (no HTTP) so the single RTK Query API owns fetching, caching
 * and error handling. Adding a new integration (e.g. SimPro) means writing one file
 * that exports a `JobsDataProvider` and registering it in `registry.ts`.
 */
export interface JobsDataProvider {
  /** App identifier — must match the `AppId` union. */
  readonly appId: AppId;

  /** Human-readable label for the switcher pill. */
  readonly label: string;

  /** Endpoint and query params for fetching jobs with the supplied filters. */
  buildJobsRequest(filters: JobsFilters): JobsRequest;

  /** Converts the endpoint's raw response into integration-agnostic jobs. */
  normaliseJobs(response: unknown): NormalizedJob[];
}
