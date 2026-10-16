"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import type { JobRow, JobsFilters } from "../../types";

type FilterPanelProps = {
  filters: JobsFilters;
  onApply: (next: JobsFilters) => void;
  onClose: () => void;
  /** Used to populate Status / Category dropdowns from the currently loaded data. */
  jobs: JobRow[];
};

const PERIOD_OPTIONS: { value: NonNullable<JobsFilters["period"]> | ""; label: string }[] = [
  { value: "", label: "All time" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "year", label: "Last 365 days" },
];

const distinct = (rows: JobRow[], key: "status" | "category"): string[] => {
  const set = new Set<string>();
  for (const row of rows) {
    const value = (row[key] ?? "").toString().trim();
    if (value) set.add(value);
  }
  return [...set].sort((firstValue, secondValue) => firstValue.localeCompare(secondValue));
};

/**
 * Dropdown panel for `/getalljobs` query filters. Holds a *draft* of the
 * filter values so users can tweak multiple controls before triggering a
 * single refetch via "Apply".
 */
export function FilterPanel({ filters, onApply, onClose, jobs }: FilterPanelProps) {
  const [draft, setDraft] = useState<JobsFilters>(filters);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset draft whenever the parent's filters change (e.g. external Reset).
  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  // Close on outside click / Escape — keeps the panel feeling like a popover.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const statuses = useMemo(() => distinct(jobs, "status"), [jobs]);
  const categories = useMemo(() => distinct(jobs, "category"), [jobs]);

  const setField = <K extends keyof JobsFilters>(key: K, value: JobsFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value || undefined }));

  const handleReset = () => {
    setDraft({});
    onApply({});
    onClose();
  };

  const handleApply = () => {
    // Backend prefers explicit dates over period — clear period if both
    // date inputs are filled, so we don't send conflicting params.
    const next: JobsFilters = { ...draft };
    if (next.date_from && next.date_to) delete next.period;
    onApply(next);
    onClose();
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 z-30 w-[320px] rounded-xl border border-border/60 bg-popover text-popover-foreground p-4 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.12)]"
      role="dialog"
      aria-label="Filter jobs"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-foreground">Filter jobs</p>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close filter panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3 text-sm">
        {/* Period */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Period</span>
          <select
            value={draft.period ?? ""}
            onChange={(event) => setField("period", (event.target.value || undefined) as JobsFilters["period"])}
            className="rounded-lg border border-border bg-background text-foreground px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">From</span>
            <input
              type="date"
              value={draft.date_from ?? ""}
              max={draft.date_to || undefined}
              onChange={(event) => setField("date_from", event.target.value)}
              className="rounded-lg border border-border bg-background text-foreground px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">To</span>
            <input
              type="date"
              value={draft.date_to ?? ""}
              min={draft.date_from || undefined}
              onChange={(event) => setField("date_to", event.target.value)}
              className="rounded-lg border border-border bg-background text-foreground px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring [color-scheme:light] dark:[color-scheme:dark]"
            />
          </label>
        </div>

        {/* Status */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Status</span>
          <select
            value={draft.status ?? ""}
            onChange={(event) => setField("status", event.target.value)}
            className="rounded-lg border border-border bg-background text-foreground px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>

        {/* Category */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Category</span>
          <select
            value={draft.category_name ?? ""}
            onChange={(event) => setField("category_name", event.target.value)}
            className="rounded-lg border border-border bg-background text-foreground px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          Reset
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleApply}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
