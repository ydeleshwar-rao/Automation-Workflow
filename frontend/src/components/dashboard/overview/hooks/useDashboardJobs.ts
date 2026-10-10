"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector } from "@/src/store/hooks";
import { selectActiveApp } from "@/src/store/appStatusSlice";
import { getJobsProvider } from "@/src/services/integrations/registry";
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

/**
 * Single source of truth for the dashboard's data layer.
 * Resolves the active integration's provider, fetches normalized jobs with the
 * supplied filters, and returns aggregated chart data + raw jobs (for drill-down).
 *
 * Refetches on:
 *   • activeApp change
 *   • any filter field change
 *   • manual `refetch()` invocation
 */
export function useDashboardJobs(filters: JobsFilters): UseDashboardJobsResult {
  const activeApp = useAppSelector(selectActiveApp);
  const provider = useMemo(() => getJobsProvider(activeApp), [activeApp]);

  const [jobs, setJobs] = useState<NormalizedJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  // Stable filter signature for the dep array — avoids refetching on every
  // render just because the parent built a fresh object literal.
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  // Tracks the most recent fetch so a stale resolution can't overwrite a newer one.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!provider) {
      setJobs([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    provider
      .fetchJobs(filters)
      .then((rows) => {
        if (requestId !== requestIdRef.current) return;
        setJobs(rows);
        setIsLoading(false);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
        let msg = "Failed to load jobs";
        if (res?.status === 401) {
          msg = res.data?.message === "invalid_token"
            ? "Your ServiceM8 connection has expired. Please reconnect from the Connections page."
            : "Your session has expired. Please log in again.";
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setError(msg);
        setJobs([]);
        setIsLoading(false);
      });
    // filters is captured via filterKey — adding it directly would make the
    // effect run on every parent render even when values are unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, filterKey, refetchTick]);

  const aggregates = useMemo(
    () => (jobs.length ? aggregate(jobs, filters.period ?? "month") : EMPTY_AGGREGATES),
    [jobs, filters.period],
  );

  return {
    jobs,
    aggregates,
    isLoading,
    error,
    appId: provider?.appId ?? null,
    appLabel: provider?.label ?? null,
    refetch: () => setRefetchTick((n) => n + 1),
  };
}
