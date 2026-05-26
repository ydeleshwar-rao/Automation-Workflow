"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Mail,
  Phone,
  RefreshCcw,
} from "lucide-react";

import { API_ROUTES } from "@/src/constants/api.constants";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import axiosInstance from "@/src/services/apiClient";
import { getActiveClientKey } from "@/src/store/localStorage";

import type { JobRow } from "./types";

function getHeaders() {
  return { clientkey: getActiveClientKey() };
}

type RawJobBundle = Record<string, unknown>;

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function formatTimeOnly(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function sameCalendarDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

type JobStatusKind = "quote" | "workOrder" | "completed" | "other";

function jobStatusKind(status: string): JobStatusKind {
  const s = status.trim().toLowerCase();
  if (s === "quote") return "quote";
  if (s === "work order" || s === "workorder") return "workOrder";
  if (s === "completed" || s === "yes") return "completed";
  return "other";
}

function jobStatusBorderClass(status: string) {
  const k = jobStatusKind(status);
  if (k === "quote") return "border-l-muted-foreground/50";
  if (k === "workOrder") return "border-l-blue-500";
  if (k === "completed") return "border-l-emerald-500";
  return "border-l-border";
}

function JobStatusBadge({ status }: { status: string }) {
  const k = jobStatusKind(status);
  const label = status.trim() || "—";
  if (k === "quote") {
    return (
      <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
        {label}
      </span>
    );
  }
  if (k === "workOrder") {
    return (
      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
        {label}
      </span>
    );
  }
  if (k === "completed") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
      {label}
    </span>
  );
}

function paymentStatusKind(raw: string): "unpaid" | "paid" | "pending" | "other" {
  const s = raw.trim().toLowerCase();
  if (s.includes("unpaid") || s === "no") return "unpaid";
  if (s.includes("paid") && !s.includes("unpaid")) return "paid";
  if (s.includes("pending")) return "pending";
  return "other";
}

function PaymentStatusBadge({ status }: { status: string }) {
  const label = status.trim() || "—";
  const k = paymentStatusKind(label);
  if (k === "unpaid") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
        {label}
      </span>
    );
  }
  if (k === "paid") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
        {label}
      </span>
    );
  }
  if (k === "pending") {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
      {label}
    </span>
  );
}

function formatActivityRow(act: Record<string, unknown>) {
  const start = String(act.start_date ?? act.startDate ?? "");
  const end = String(act.end_date ?? act.endDate ?? "");
  const sched = String(act.status ?? act.type ?? "Scheduled");
  if (!start && !end) return null;

  let range: string;
  if (start && end && sameCalendarDay(start, end)) {
    const datePart = formatDate(start);
    const startT = formatTimeOnly(start);
    const endT = formatTimeOnly(end);
    range = `📅 ${datePart}, ${startT} → ${endT}`;
  } else if (start && end) {
    range = `📅 ${formatDateTime(start)} → ${formatDateTime(end)}`;
  } else if (start) {
    range = `📅 ${formatDateTime(start)} → —`;
  } else {
    range = `📅 — → ${formatDateTime(end)}`;
  }
  return `${range}  (${sched})`;
}

function descriptionNeedsToggle(text: string) {
  const t = text.trim();
  if (!t) return false;
  const lines = t.split(/\r?\n/);
  if (lines.length > 3) return true;
  return t.length > 220;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{children}</p>
  );
}

function DescriptionBlock({
  text,
  expanded,
  onToggle,
}: {
  text: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const raw = text.trim();
  if (!raw) {
    return (
      <div>
        <FieldLabel>Description</FieldLabel>
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    );
  }
  const needs = descriptionNeedsToggle(raw);
  return (
    <div>
      <FieldLabel>Description</FieldLabel>
      <div
        className={cn(
          "text-sm text-foreground whitespace-pre-wrap",
          !expanded && needs && "line-clamp-3"
        )}
      >
        {raw}
      </div>
      {needs && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export type JobDetailViewProps = {
  customer: JobRow;
  allJobs: JobRow[];
  integration: "servicem8" | "commusoft" | "simpro";
  onBack: () => void;
  rawGroups?: Record<string, unknown>[];
};

export function JobDetailView({ customer, allJobs, integration, onBack, rawGroups }: JobDetailViewProps) {
  // Derive bundles synchronously from already-loaded rawGroups (no extra API call).
  // Returns null when rawGroups is absent or doesn't contain this customer — triggers API fallback.
  const prefetchedBundles = useMemo((): RawJobBundle[] | null => {
    if (!rawGroups?.length) return null;
    const customerName = customer.name.trim().toLowerCase();
    const seen = new Set<string>();
    const bundles: RawJobBundle[] = [];
    let foundGroup = false;
    for (const group of rawGroups) {
      const contact = asRecord(group.contact);
      const rawName = String(contact?.name ?? group.contact_name ?? group.name ?? "").trim().toLowerCase();
      if (rawName !== customerName) continue;
      foundGroup = true;
      const site = asRecord(group.site) ?? {};
      const jobItems = Array.isArray(group.jobs) ? (group.jobs as RawJobBundle[]) : [];
      for (const jobItem of jobItems) {
        const job = asRecord(jobItem.job) ?? {};
        const uuid = String(
          (job.job_uuid as string | undefined) ??
          (job.generated_job_id as string | undefined) ?? ""
        );
        if (uuid && seen.has(uuid)) continue;
        if (uuid) seen.add(uuid);
        bundles.push({
          job,
          payment: asRecord(jobItem.payment) ?? {},
          activities: Array.isArray(jobItem.activities) ? jobItem.activities : [],
          site,
          contact: contact ?? {},
        });
      }
    }
    return foundGroup ? bundles : null;
  }, [rawGroups, customer.name]);

  const [rawItems, setRawItems] = useState<RawJobBundle[]>(() => prefetchedBundles ?? []);
  const [loading, setLoading] = useState(() => prefetchedBundles === null);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(prefetchedBundles !== null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [descExpandedIds, setDescExpandedIds] = useState<Set<string>>(new Set());
  const [liveTime, setLiveTime] = useState(() =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
  const [showJson, setShowJson] = useState(false);

  const load = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        const headers = getHeaders();
        if (!headers.clientkey) {
          setError("Integration not connected. Please connect from Connections page.");
          setRawItems([]);
          return;
        }

        const endpointMap: Record<"servicem8" | "commusoft" | "simpro", string> = {
          servicem8: API_ROUTES.SERVICEM8.GET_ALL_JOBS,
          commusoft: API_ROUTES.COMMUSOFT.GET_ALL_JOBS,
          simpro: API_ROUTES.SIMPRO.GET_ALL_JOBS,
        };
        const endpoint = endpointMap[integration] ?? API_ROUTES.SERVICEM8.GET_ALL_JOBS;

        const { data: result } = await axiosInstance.get<{
          success?: boolean;
          data?: unknown;
          meta?: unknown;
        }>(endpoint, {
          headers: { ...headers, "Content-Type": "application/json" },
        });
        // Handle streaming format (data is array) and legacy format (data.data is array)
        const rawData: RawJobBundle[] = Array.isArray(result?.data)
          ? (result.data as RawJobBundle[])
          : Array.isArray((result?.data as Record<string, unknown>)?.data)
          ? ((result?.data as Record<string, unknown>).data as RawJobBundle[])
          : [];
        const customerName = customer.name.trim().toLowerCase();

        // API returns contact/site groups, each with a `jobs[]` array.
        // Find groups matching this customer and flatten into individual job bundles.
        const seen = new Set<string>();
        const flatBundles: RawJobBundle[] = [];
        for (const group of rawData) {
          const contact = asRecord(group.contact);
          const rawName = String(contact?.name ?? group.contact_name ?? group.name ?? "").trim().toLowerCase();
          if (rawName !== customerName) continue;

          const site = asRecord(group.site) ?? {};
          const jobItems = Array.isArray(group.jobs) ? (group.jobs as RawJobBundle[]) : [];
          for (const jobItem of jobItems) {
            const job = asRecord(jobItem.job) ?? {};
            const uuid = String(
              (job.job_uuid as string | undefined) ??
              (job.generated_job_id as string | undefined) ?? ""
            );
            if (uuid && seen.has(uuid)) continue;
            if (uuid) seen.add(uuid);
            flatBundles.push({
              job,
              payment: asRecord(jobItem.payment) ?? {},
              activities: Array.isArray(jobItem.activities) ? jobItem.activities : [],
              site,
              contact: contact ?? {},
            });
          }
        }
        setRawItems(flatBundles);
      } catch (err: unknown) {
        const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
        if (res?.status === 401) {
          setError(
            res.data?.message === "invalid_token"
              ? "Your ServiceM8 connection has expired. Please reconnect from the Connections page."
              : "Your session has expired. Please log in again."
          );
        } else {
          setError("Failed to load job details");
        }
        setRawItems([]);
      } finally {
        setLoading(false);
      }
    },
    [allJobs.length, customer.name, integration]
  );

  useEffect(() => {
    if (initializedRef.current) return; // already seeded from rawGroups — skip API call
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      setLiveTime(
        new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const jobCount = rawItems.length;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDesc = (id: string) => {
    setDescExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const jsonPayload = useMemo(() => JSON.stringify(rawItems, null, 2), [rawItems]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden bg-background rounded-xl border border-border/60 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]">
      <div className="flex-shrink-0 bg-background border-b border-border/60 px-6 py-4">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-3 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-foreground hover:bg-muted"
                onClick={onBack}
                aria-label="Back to customers"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">
                    {customer.name || "—"}
                  </h1>
                  <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {jobCount} jobs
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{customer.email?.trim() || "—"}</span>
                  </span>
                  <span className="text-border hidden sm:inline">|</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {customer.phone?.trim() || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
                <span>Live · {liveTime}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-border bg-background text-foreground hover:bg-muted"
                onClick={() => load()}
                disabled={loading}
              >
                <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button type="button" size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 border-0">
                Summary
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 border-border bg-background text-foreground hover:bg-muted"
                onClick={() => setShowJson((v) => !v)}
              >
                JSON
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showJson && (
        <div className="border-b border-border/60 bg-muted/40 p-4 max-h-64 overflow-auto">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">{jsonPayload}</pre>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading jobs…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : rawItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs found for this customer.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {rawItems.map((item, index) => {
              const job = asRecord(item.job) ?? {};
              const site = asRecord(item.site) ?? {};
              const payment = asRecord(item.payment) ?? {};
              const activitiesRaw = item.activities;
              const activities = Array.isArray(activitiesRaw) ? activitiesRaw : [];
              const activityCount = activities.length;
              const poRaw = job.purchase_order_number;
              const hasPo = poRaw !== null && poRaw !== undefined && String(poRaw).trim() !== "";
              const poDisplay = hasPo ? String(poRaw).trim() : "—";
              const dateIso = String(job.date ?? job.completion_date ?? "").trim();
              const statusStr = String(job.status ?? "");
              const jobRef = String(site.abn_number ?? job.generated_job_id ?? "—");
              const jobDesc = String(job.job_description ?? job.category ?? "—");
              const uniqueJobId = String(job.job_uuid ?? job.generated_job_id ?? `idx-${index}`);
              const jobIdShort = String(job.job_uuid ?? "").slice(0, 8);
              const displayId = jobRef !== "—" ? jobRef : jobIdShort || "—";
              const expanded = expandedIds.has(uniqueJobId);
              const descExpanded = descExpandedIds.has(uniqueJobId);

              return (
                <div key={uniqueJobId} className="py-4 first:pt-0">
                  <div
                    className={cn(
                      "border-l-4 pl-3 -ml-0.5 rounded-l-sm",
                      jobStatusBorderClass(statusStr)
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(uniqueJobId)}
                      className="w-full text-left flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-[#f97316]">#{displayId}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            JOB
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {statusStr || "—"}
                          </span>
                          <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-bold text-foreground tabular-nums">
                            {activityCount}
                          </span>
                        </div>
                        <p className="text-sm text-foreground truncate">{jobDesc}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            {formatDate(dateIso)}
                          </span>
                          <span>·</span>
                          <span>PO: {poDisplay}</span>
                          <span>·</span>
                          <span>
                            {activityCount} {activityCount === 1 ? "activity" : "activities"}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground">
                        Expand
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                        />
                      </div>
                    </button>

                    {expanded && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/40 rounded-b-lg border-t border-border/60 mt-3">
                        <div className="space-y-3">
                          <div>
                            <FieldLabel>Status</FieldLabel>
                            <JobStatusBadge status={statusStr} />
                          </div>
                          <div>
                            <FieldLabel>Category</FieldLabel>
                            <p className="text-sm text-foreground">{String(job.category ?? "").trim() || "—"}</p>
                          </div>
                          <div>
                            <FieldLabel>Purchase order</FieldLabel>
                            <p className="text-sm text-foreground">{hasPo ? String(poRaw).trim() : "—"}</p>
                          </div>
                          <div>
                            <FieldLabel>Payment status</FieldLabel>
                            <PaymentStatusBadge status={String(payment.status ?? "—")} />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <FieldLabel>Date</FieldLabel>
                            <p className="text-sm text-foreground">{formatDate(dateIso)}</p>
                          </div>
                          <div>
                            <FieldLabel>Quote date</FieldLabel>
                            <p className="text-sm text-foreground">
                              {formatDateTime(String(job.quote_date ?? "").trim())}
                            </p>
                          </div>
                          <div>
                            <FieldLabel>Site address</FieldLabel>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {String(site.address ?? "").trim() || "—"}
                            </p>
                          </div>
                        </div>

                        <div className="col-span-2 space-y-2">
                          <FieldLabel>Activities</FieldLabel>
                          {activities.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No activities</p>
                          ) : (
                            <ul className="space-y-2">
                              {activities.map((act, i) => {
                                const a = asRecord(act) ?? {};
                                const line = formatActivityRow(a);
                                if (!line) return null;
                                return (
                                  <li key={i} className="text-sm text-foreground">
                                    {line}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>

                        <div className="col-span-2 border-t border-border/60 pt-3 mt-1">
                          <DescriptionBlock
                            text={String(job.job_description ?? "")}
                            expanded={descExpanded}
                            onToggle={() => toggleDesc(uniqueJobId)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-border/60 bg-background px-6 py-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {rawItems.length} unique job{rawItems.length === 1 ? "" : "s"} for {customer.name || "customer"}
        </p>
      </div>
    </div>
  );
}
