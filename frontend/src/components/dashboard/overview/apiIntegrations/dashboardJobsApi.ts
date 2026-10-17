import { baseApi } from "@/src/store/baseApi";
import {
  getRegisteredJobsProvider,
  type JobsProviderAppId,
} from "@/src/services/integrations/registry";
import type { JobsFilters, NormalizedJob } from "@/src/types/dashboard.types";

export interface IntegrationJobsArgs {
  appId: JobsProviderAppId;
  filters: JobsFilters;
}

const DASHBOARD_JOBS_TAG = "DashboardJobs";

/**
 * Jobs for one integration. The provider decides the endpoint, params and
 * normalisation; RTK Query caches per `{ appId, filters }`, so a slow response
 * for old filters can never overwrite the data for the current ones.
 */
export const dashboardJobsApi = baseApi
  .enhanceEndpoints({ addTagTypes: [DASHBOARD_JOBS_TAG] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getIntegrationJobs: builder.query<NormalizedJob[], IntegrationJobsArgs>({
        query: ({ appId, filters }) => ({
          method: "GET",
          ...getRegisteredJobsProvider(appId).buildJobsRequest(filters),
        }),
        transformResponse: (response: unknown, _meta, { appId }) =>
          getRegisteredJobsProvider(appId).normaliseJobs(response),
        providesTags: (_result, _error, { appId }) => [{ type: DASHBOARD_JOBS_TAG, id: appId }],
      }),
    }),
  });

export const { useGetIntegrationJobsQuery } = dashboardJobsApi;
