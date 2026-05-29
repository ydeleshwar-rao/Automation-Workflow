import type { JobsFilters, NormalizedJob } from "@/src/types/dashboard.types";
import type { AppId } from "@/src/store/appStatusSlice";

/**
 * Contract every integration must satisfy to plug into the dashboard.
 *
 * Adding a new integration (e.g. SimPro) means writing one file that exports
 * a `JobsDataProvider` and registering it in `registry.ts`. No DashboardOverview
 * changes required.
 */
export interface JobsDataProvider {
  /** App identifier — must match the `AppId` union. */
  readonly appId: AppId;

  /** Human-readable label for the switcher pill. */
  readonly label: string;

  /**
   * Fetch normalized jobs honouring the supplied filters.
   * Implementations should fall back gracefully (return [] on failure) and let
   * the caller decide how to surface errors via the second tuple element.
   */
  fetchJobs(filters: JobsFilters): Promise<NormalizedJob[]>;
}
