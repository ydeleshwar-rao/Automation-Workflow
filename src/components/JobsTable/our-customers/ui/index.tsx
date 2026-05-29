"use client";

import { useState } from "react";

import { Loader2, Lock, Mail, Phone, RefreshCcw, User, UserPlus } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

import { JobDetailView } from "../../JobDetailView";
import { SearchBar } from "../../SearchBar";
import { normalizeStatusKey } from "../../utils";
import type { JobRow, JobsFilters, JobsTabProps } from "../../types";
import { useCustomers } from "../hooks";

export type JobsCustomersProps = JobsTabProps & {
  integration: "servicem8" | "commusoft" | "simpro";
  loadError: string | null;
  lastSyncedAt: Date | null;
  onRefresh: () => void;
  isSyncing?: boolean;
  filters: JobsFilters;
  onFiltersChange: (next: JobsFilters) => void;
  rawGroups: Record<string, unknown>[];
  hasMoreApiPages: boolean;
  hasPrevApiPages: boolean;
  apiPageNum: number;
  onLoadNextApiPage: () => void;
  onLoadPrevApiPage: () => void;
};

function formatLastSyncLabel(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const AVATAR_PALETTE = [
  { bg: "#fee2e2", fg: "#ef4444" },
  { bg: "#ffedd5", fg: "#f97316" },
  { bg: "#dcfce7", fg: "#22c55e" },
  { bg: "#ccfbf1", fg: "#14b8a6" },
  { bg: "#dbeafe", fg: "#3b82f6" },
  { bg: "#ede9fe", fg: "#8b5cf6" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusCell({ status }: { status: string }) {
  const key = normalizeStatusKey(status);
  const display = status.trim() || "—";
  if (key === "quote") return <span className="text-sm text-muted-foreground">{display}</span>;
  if (key === "workOrder") return <span className="text-sm text-blue-500 dark:text-blue-400">{display}</span>;
  if (key === "completed") return <span className="text-sm text-emerald-600 dark:text-emerald-400">{display}</span>;
  return <span className="text-sm text-muted-foreground">{display}</span>;
}

export function CustomersUI({
  jobs,
  rawGroups,
  loading,
  integration,
  loadError,
  lastSyncedAt,
  onRefresh,
  isSyncing = false,
  filters,
  onFiltersChange,
  hasMoreApiPages,
  hasPrevApiPages,
  apiPageNum,
  onLoadNextApiPage,
  onLoadPrevApiPage,
}: JobsCustomersProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<JobRow | null>(null);
  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    paginatedJobs,
    total,
    totalPages,
    stats,
  } = useCustomers(jobs);

  // Count truthy filter fields so the button can show "Filter (3)".
  const activeFilterCount = (Object.keys(filters) as (keyof JobsFilters)[]).reduce(
    (n, k) => (filters[k] ? n + 1 : n),
    0,
  );

  if (selectedCustomer) {
    return (
      <JobDetailView
        customer={selectedCustomer}
        allJobs={jobs}
        rawGroups={rawGroups}
        integration={integration}
        onBack={() => setSelectedCustomer(null)}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-background shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)] flex flex-col h-[calc(100vh-200px)] overflow-hidden">
      <div className="flex-shrink-0 bg-background px-4 py-3 border-b border-border/60 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium lowercase">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            last synced: {formatLastSyncLabel(lastSyncedAt)}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-foreground tracking-tight">Our Customers</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              <span>
                <span className="font-semibold text-foreground">{stats.withLogins}</span> have logins
              </span>
            </div>

          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="w-full max-w-[500px]">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search clients, emails, or job numbers..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 gap-2 text-sm font-medium border-border bg-background text-foreground hover:bg-muted"
              onClick={() => onRefresh()}
              disabled={isSyncing}
            >
              <RefreshCcw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Refresh"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 gap-2 text-sm font-medium border-border bg-background text-foreground hover:bg-muted"
              disabled={loading || !!loadError}
            >
              <User className="h-4 w-4" />
              Sync Jobs
            </Button>
    
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-shrink-0 grid grid-cols-[2fr_2fr_1fr_1fr_1fr] bg-muted/30 border-b border-t border-border/60 px-4 py-2">
          <span className="text-xs font-bold text-muted-foreground">CUSTOMER</span>
          <span className="text-xs font-bold text-muted-foreground">EMAIL</span>
          <span className="text-xs font-bold text-muted-foreground">PHONE</span>
          <span className="text-xs font-bold text-muted-foreground">STATUS</span>
          <span className="text-xs font-bold text-muted-foreground">ACTIONS</span>
        </div>

        <div className="flex-1 overflow-y-auto bg-background [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
              <p className="text-sm font-medium">Loading jobs...</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-24 px-6 text-center">
              <p className="text-base font-semibold text-destructive">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => onRefresh()} className="mt-2">
                Try again
              </Button>
            </div>
          ) : paginatedJobs.length > 0 ? (
            <div className="divide-y divide-border/60">
              {paginatedJobs.map((job: JobRow, idx: number) => {
                const palette = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
                const hasEmail = !!(job.email ?? "").trim();
                const hasPhone = !!(job.phone ?? "").trim();
                return (
                  <div
                    key={job.id ? `job-${job.id}` : `row-${idx}`}
                    className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="pr-3 min-w-0">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          style={{ backgroundColor: palette.bg, color: palette.fg }}
                        >
                          {getInitials(job.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{job.name || "—"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{job.address || "—"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="pr-3 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                        {hasEmail ? (
                          <span className="text-foreground truncate" title={job.email}>
                            {job.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div className="pr-3">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                        {hasPhone ? job.phone : <span className="text-muted-foreground">—</span>}
                      </div>
                    </div>
                    <div className="pr-3">
                      <StatusCell status={job.status} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs font-semibold border-border"
                          onClick={() => setSelectedCustomer(job)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-16 text-center">
              <p className="text-foreground font-medium">No jobs to display</p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeFilterCount > 0 && searchQuery.trim()
                  ? "No jobs match the current filters and search."
                  : activeFilterCount > 0
                  ? "No jobs match the current filters."
                  : searchQuery.trim()
                  ? "No jobs match your search."
                  : "No jobs available yet — try syncing your integration."}
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                {activeFilterCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onFiltersChange({})}
                  >
                    Clear filters
                  </Button>
                )}
                {searchQuery.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border/60 bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">
            {total} row(s) · page {currentPage}/{totalPages}
          </p>
          {(hasMoreApiPages || hasPrevApiPages) && (
            <span className="text-[11px] font-semibold text-orange-500 dark:text-orange-400">
              Batch {apiPageNum}{hasMoreApiPages ? " · more available" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 px-4 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 border-0"
            disabled={currentPage <= 1 && !hasPrevApiPages}
            onClick={() => {
              if (currentPage > 1) {
                setCurrentPage((p) => Math.max(1, p - 1));
              } else if (hasPrevApiPages) {
                onLoadPrevApiPage();
              }
            }}
          >
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 px-4 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 border-0"
            disabled={currentPage >= totalPages && !hasMoreApiPages}
            onClick={() => {
              if (currentPage < totalPages) {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
              } else if (hasMoreApiPages) {
                onLoadNextApiPage();
              }
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
