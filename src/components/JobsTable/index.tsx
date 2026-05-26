"use client";

import { useCallback, useEffect, useState } from "react";

import { Filter } from "lucide-react";

import { API_ROUTES } from "@/src/constants/api.constants";
import { cn } from "@/src/lib/utils";
import axiosInstance from "@/src/services/apiClient";
import { getActiveClientKey } from "@/src/store/localStorage";

import { JobsAnalytics } from "./analytics";
import { JobsCustomers } from "./our-customers";
import { JobsEngineers } from "./our-engineers";
import { FilterPanel } from "./our-customers/ui/FilterPanel";
import type { JobRow, JobsFilters } from "./types";

export type { JobRow, JobsFilters, JobsTabProps, MockJobRow } from "./types";
export { getServicem8StatsFromJobs } from "./utils";
void JobsEngineers;

function getHeaders() {
  return { clientkey: getActiveClientKey() };
}

type JobsTableRootProps = {
  integration?: IntegrationType;
  onJobsChange?: (jobs: JobRow[]) => void;
};

type TabId = "analytics" | "customers";
type IntegrationType = "servicem8" | "commusoft" | "simpro";

const INTEGRATION_CONFIG: Record<
  IntegrationType,
  { endpoint: string; syncEndpoint: string; label: string }
> = {
  servicem8: {
    endpoint: API_ROUTES.SERVICEM8.GET_ALL_JOBS,
    syncEndpoint: API_ROUTES.SERVICEM8.SYNC,
    label: "ServiceM8",
  },
  commusoft: {
    endpoint: API_ROUTES.COMMUSOFT.GET_ALL_JOBS,
    syncEndpoint: API_ROUTES.COMMUSOFT.SYNC,
    label: "Commusoft",
  },
  simpro: {
    endpoint: API_ROUTES.SIMPRO.GET_ALL_JOBS,
    syncEndpoint: API_ROUTES.SIMPRO.SYNC,
    label: "simPRO",
  },
};

// Trim & normalize. Treats null/undefined/whitespace as empty so the fallback
// chain below doesn't fall on a string of spaces.
const str = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return s;
};
const firstNonEmpty = (...vals: unknown[]): string => {
  for (const v of vals) {
    const s = str(v);
    if (s) return s;
  }
  return "";
};

// The API now returns contact/site groups, each with a `jobs[]` array.
// mapItem normalises one job item within a group into a flat JobRow.
function mapItem(
  jobItem: Record<string, unknown>,
  contact: Record<string, unknown> | null | undefined,
  site: Record<string, unknown> | null | undefined,
  headOffice: Record<string, unknown> | null | undefined,
): JobRow {
  const job = (jobItem.job ?? {}) as Record<string, unknown>;
  const payment = (jobItem.payment ?? {}) as Record<string, unknown>;

  // Prefer invoiced total from payment; fall back to job-level amount.
  const rawAmount = str(payment.total_invoice ?? job.total_invoice_amount);

  return {
    id: str(job.generated_job_id),
    name: firstNonEmpty(contact?.name, site?.name, headOffice?.name),
    email: str(contact?.email),
    phone: firstNonEmpty(contact?.phone, contact?.mobile),
    address: firstNonEmpty(site?.address, job.job_address),
    status: str(job.status),
    category: str(job.category),
    date: str(job.date || job.quote_date),
    total_invoice_amount: rawAmount || 0,
    revenue: rawAmount || 0,
  };
}

// Strip empty / nullish entries so we never send `?status=` or `?period=undefined`
// (the backend would treat those as filter conditions and break the SM8 $filter).
const buildFilterParams = (filters: JobsFilters): Record<string, string> => {
  const params: Record<string, string> = {};
  if (filters.period)        params.period = filters.period;
  if (filters.date_from)     params.date_from = filters.date_from;
  if (filters.date_to)       params.date_to = filters.date_to;
  if (filters.status)        params.status = filters.status;
  if (filters.category_name) params.category_name = filters.category_name;
  return params;
};

export function JobsTable({
  integration: integrationProp = "servicem8",
  onJobsChange,
}: JobsTableRootProps) {
  const config = INTEGRATION_CONFIG[integrationProp];
  const [activeTab, setActiveTab] = useState<TabId>("analytics");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [rawGroups, setRawGroups] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Server-side cursor pagination
  const [apiCursor, setApiCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Filters live on the parent so both Analytics and Customers tabs see the same
  // filtered job set. Changing a filter triggers a refetch via `fetchJobs`'s
  // useCallback dep on `filters`.
  const [filters, setFilters] = useState<JobsFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = (Object.keys(filters) as (keyof JobsFilters)[]).reduce(
    (n, k) => (filters[k] ? n + 1 : n),
    0,
  );

  const fetchJobs = useCallback(
    async (cur?: string) => {
      try {
        setLoading(true);
        setLoadError(null);

        const headers = getHeaders();
        if (!headers.clientkey) {
          setLoadError("Integration not connected. Please connect from Connections page.");
          setJobs([]);
          setRawGroups([]);
          onJobsChange?.([]);
          return;
        }

        const params: Record<string, string> = { ...buildFilterParams(filters), limit: "50" };
        if (cur) params.cursor = cur;
        console.log("[JobsTable] → GET", config.endpoint, "params=", params);

        const { data: result } = await axiosInstance.get<{
          success?: boolean;
          data?: unknown;
          meta?: { has_more: boolean; next_cursor: string | null; total_returned: number };
        }>(config.endpoint, {
          headers: { ...headers, "Content-Type": "application/json" },
          params,
        });

        // Both ServiceM8 and Commusoft now stream: { success, data: [...groups], meta }
        // Legacy ApiResponse wraps it as: { data: { success, data: [...groups] } }
        const rawData: Record<string, unknown>[] = Array.isArray(result?.data)
          ? (result.data as Record<string, unknown>[])
          : Array.isArray((result?.data as Record<string, unknown>)?.data)
          ? ((result?.data as Record<string, unknown>).data as Record<string, unknown>[])
          : [];

        const meta = result?.meta;
        setHasMore(meta?.has_more ?? false);
        setNextCursor(meta?.next_cursor ?? null);

        console.log("[JobsTable] ← raw groups:", rawData.length, "has_more:", meta?.has_more ?? false);

        setRawGroups(rawData);
        const mapped: JobRow[] = rawData
          .flatMap((group) => {
            const contact = group.contact as Record<string, unknown> | null | undefined;
            const site = group.site as Record<string, unknown> | null | undefined;
            const headOffice = group.head_office as Record<string, unknown> | null | undefined;
            const jobItems = (group.jobs ?? []) as Record<string, unknown>[];
            return jobItems.map((jobItem) => mapItem(jobItem, contact, site, headOffice));
          })
          .filter((row) => row.id !== "");
        console.log("[JobsTable] ✓ mapped rows after flatten:", mapped.length);
        setJobs(mapped);
        onJobsChange?.(mapped);
        setLastSyncAt(new Date());
      } catch (err) {
        console.error("[JobsTable] ✖ fetch failed:", err);
        const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
        if (res?.status === 401) {
          setLoadError(
            res.data?.message === "invalid_token"
              ? "Your ServiceM8 connection has expired. Please reconnect from the Connections page."
              : "Your session has expired. Please log in again."
          );
        } else {
          setLoadError("Failed to load jobs");
        }
        setJobs([]);
        setRawGroups([]);
        onJobsChange?.([]);
      } finally {
        setLoading(false);
      }
    },
    [config.endpoint, integrationProp, onJobsChange, filters]
  );

  // Navigate to the next API batch
  const handleApiNextPage = useCallback(() => {
    if (!hasMore || !nextCursor) return;
    setCursorHistory((prev) => [...prev, apiCursor]);
    setApiCursor(nextCursor);
    fetchJobs(nextCursor);
  }, [hasMore, nextCursor, apiCursor, fetchJobs]);

  // Navigate to the previous API batch
  const handleApiPrevPage = useCallback(() => {
    if (cursorHistory.length === 0) return;
    const history = [...cursorHistory];
    const prevCursor = history.pop();
    setCursorHistory(history);
    setApiCursor(prevCursor);
    fetchJobs(prevCursor);
  }, [cursorHistory, fetchJobs]);

  const handleSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      const headers = getHeaders();
      if (!headers.clientkey) {
        setLoadError("Integration not connected. Please connect from Connections page.");
        return;
      }
      await axiosInstance.post(config.syncEndpoint, {}, { headers });
      // After sync always reset to page 1
      setCursorHistory([]);
      setApiCursor(undefined);
      await fetchJobs(undefined);
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [config.syncEndpoint, fetchJobs]);

  // When filters or integration change (fetchJobs recreates), reset pagination and fetch page 1
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("servicem8_jobs_cache");
      localStorage.removeItem("servicem8_jobs_raw_cache");
      localStorage.removeItem("commusoft_jobs_cache");
      localStorage.removeItem("commusoft_jobs_raw_cache");
      localStorage.removeItem("simpro_jobs_cache");
      localStorage.removeItem("simpro_jobs_raw_cache");
    }
    setCursorHistory([]);
    setApiCursor(undefined);
    fetchJobs(undefined);
  }, [fetchJobs]);

  return (
    <div className="mr-1 flex h-full w-[calc(100%_-_10px)] flex-col gap-5 rounded-2xl border border-border/60 bg-background/90 p-2 font-sans shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]">
      <div className="rounded-xl border border-border/60 bg-muted/30 p-1.5">
        <div className="flex items-center justify-between gap-2">
          <nav className="flex gap-1" aria-label="Jobs sections">
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "analytics"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Analytics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("customers")}
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "customers"
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Our Customers
            </button>
          </nav>

          {/* Global filter — applies to both Analytics and Our Customers */}
          <div className="relative pr-1">
            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeFilterCount > 0
                  ? "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                  : "border border-border bg-background text-foreground hover:bg-muted"
              )}
              aria-expanded={showFilters}
              aria-haspopup="dialog"
              title="Filter jobs (applies to Analytics and Customers)"
            >
              <Filter className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {showFilters && (
              <FilterPanel
                filters={filters}
                jobs={jobs}
                onApply={setFilters}
                onClose={() => setShowFilters(false)}
              />
            )}
          </div>
        </div>
      </div>

      {activeTab === "analytics" ? (
        <JobsAnalytics jobs={jobs} loading={loading} integrationName={config.label} />
      ) : (
        <JobsCustomers
          jobs={jobs}
          rawGroups={rawGroups}
          loading={loading}
          integration={integrationProp}
          loadError={loadError}
          lastSyncedAt={lastSyncAt}
          onRefresh={handleSync}
          isSyncing={isSyncing}
          filters={filters}
          onFiltersChange={setFilters}
          hasMoreApiPages={hasMore}
          hasPrevApiPages={cursorHistory.length > 0}
          apiPageNum={cursorHistory.length + 1}
          onLoadNextApiPage={handleApiNextPage}
          onLoadPrevApiPage={handleApiPrevPage}
        />
      )}
    </div>
  );
}
