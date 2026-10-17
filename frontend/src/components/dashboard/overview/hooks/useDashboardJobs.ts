"use client";

import { useMemo } from "react";
import type { SerializedError } from "@reduxjs/toolkit";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { useAppSelector } from "@/src/store/hooks";
import { selectActiveApp } from "@/src/store/appStatusSlice";
import type { AxiosBaseQueryError } from "@/src/store/axiosBaseQuery";
import {
  getRegisteredJobsProvider,
  isJobsProviderAppId,
} from "@/src/services/integrations/registry";
import { useGetIntegrationJobsQuery } from "../apiIntegrations/dashboardJobsApi";
import { aggregate } from "../utils/aggregate";
import type {
  DashboardAggregates,
  JobsFilters,
  NormalizedJob,
} from "@/src/types/dashboard.types";

export interface UseDashboardJobsResult {
  jobs: NormalizedJob[];
  aggregates: DashboardAggregates;
  isLoading: boolean;
  error: string | null;
  appId: string | null;
  appLabel: string | null;
  refetch: () => void;
}

const EMPTY_AGGREGATES: DashboardAggregates = {
  kpis: { total_jobs: 0, total_revenue: 0, completion_pct: 0, active_teams: 0 },
  activity: [],
  by_category: [],
  job_status: [],
  top_performers: [],
  pending_by_day: [],
};

const NO_JOBS: NormalizedJob[] = [];
const UNAUTHORIZED_STATUS = 401;
const INTEGRATION_TOKEN_INVALID = "invalid_token";
const DEFAULT_ERROR_MESSAGE = "Failed to load jobs";
const INTEGRATION_EXPIRED_MESSAGE =
  "Your ServiceM8 connection has expired. Please reconnect from the Connections page.";
const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please log in again.";

const readErrorMessage = (errorBody: unknown): string | undefined => {
  if (typeof errorBody !== "object" || errorBody === null) return undefined;
  const message = (errorBody as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
};

/** Turns an RTK Query error into the message shown in the dashboard banner. */
const describeJobsError = (
  queryError: AxiosBaseQueryError | SerializedError | undefined,
): string | null => {
  if (!queryError) return null;
  if ("status" in queryError && queryError.status === UNAUTHORIZED_STATUS) {
    // The backend reports an expired integration token as 401 + "invalid_token"; any other 401 is our own session.
    return readErrorMessage(queryError.data) === INTEGRATION_TOKEN_INVALID
      ? INTEGRATION_EXPIRED_MESSAGE
      : SESSION_EXPIRED_MESSAGE;
  }
  if ("data" in queryError && typeof queryError.data === "string") return queryError.data;
  if ("message" in queryError && queryError.message) return queryError.message;
  return DEFAULT_ERROR_MESSAGE;
};

/**
 * Single source of truth for the dashboard's data layer.
 * Resolves the active integration's provider, fetches its normalized jobs with
 * the supplied filters through RTK Query, and returns aggregated chart data +
 * raw jobs (for drill-down). RTK Query refetches whenever the app or any filter
 * value changes, and on manual `refetch()`.
 */
export function useDashboardJobs(filters: JobsFilters): UseDashboardJobsResult {
  const activeApp = useAppSelector(selectActiveApp);
  const jobsAppId = isJobsProviderAppId(activeApp) ? activeApp : null;
  const provider = jobsAppId ? getRegisteredJobsProvider(jobsAppId) : null;

  const { data, error: queryError, isError, isFetching, refetch } = useGetIntegrationJobsQuery(
    jobsAppId ? { appId: jobsAppId, filters } : skipToken,
  );

  // `data` keeps the previous result while new filters load (no flicker), but must not survive an error.
  const jobs = isError || !data ? NO_JOBS : data;

  const aggregates = useMemo(
    () => (jobs.length ? aggregate(jobs, filters.period ?? "month") : EMPTY_AGGREGATES),
    [jobs, filters.period],
  );

  return {
    jobs,
    aggregates,
    isLoading: isFetching,
    error: describeJobsError(queryError),
    appId: provider?.appId ?? null,
    appLabel: provider?.label ?? null,
    refetch: () => {
      if (jobsAppId) refetch();
    },
  };
}
