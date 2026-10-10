"use client";

import { Skeleton } from "@/src/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2 w-full pr-10">
      <Skeleton className="h-2 w-3/4" />
      <Skeleton className="h-2 w-1/2 opacity-50" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-2 w-1/2" />
            <Skeleton className="h-2 w-1/3 opacity-50" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function IntegrationCardSkeleton({
  index = 0,
}: {
  index?: number;
}) {
  return (
    <div
      className="relative flex items-center min-h-[72px] rounded-xl border border-border/50 bg-card overflow-hidden opacity-0 animate-fade-slide"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="w-[64px] shrink-0 self-stretch bg-slate-200 dark:bg-slate-700/50" />
      <div className="absolute left-[40px] top-1/2 -translate-y-1/2">
        <Skeleton className="w-12 h-12 rounded-lg" />
      </div>
      <div className="flex-1 flex items-center justify-between pl-12 pr-6 py-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2 w-20 opacity-50" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function ConnectionsPageSkeleton({
  rows = 4,
}: {
  rows?: number;
}) {
  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-11 flex-1 rounded-xl" />
        <Skeleton className="h-11 w-20 rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: rows }).map((_, i) => (
            <IntegrationCardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MetricCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="h-[72px] rounded-xl bg-slate-200 dark:bg-slate-700/50 opacity-0 animate-fade-slide"
      style={{ animationDelay: `${index * 80}ms` }}
    />
  );
}

export function JobRowSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="flex items-center min-h-[48px] rounded-xl border border-border/50 bg-card overflow-hidden opacity-0 animate-fade-slide"
      style={{ animationDelay: `${(index + 5) * 80}ms` }}
    >
      <div className="w-[56px] self-stretch bg-slate-200 dark:bg-slate-700/50 shrink-0" />
      <div className="flex-1 flex items-center justify-between pl-10 pr-6 py-3">
        <div className="space-y-2">
          <div className="h-3 w-32 rounded-md bg-slate-200 dark:bg-slate-700/50" />
          <div className="h-2 w-20 rounded-md bg-slate-200 dark:bg-slate-700/50 opacity-50" />
        </div>
        <div className="h-7 w-20 rounded-full bg-slate-200 dark:bg-slate-700/50" />
      </div>
    </div>
  );
}

export function DashboardPageSkeleton({
  metricCount = 5,
  rowCount = 4,
}: {
  metricCount?: number;
  rowCount?: number;
}) {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {metricCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: metricCount }).map((_, i) => (
            <MetricCardSkeleton key={i} index={i} />
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3">
        {Array.from({ length: rowCount }).map((_, i) => (
          <JobRowSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

export function TablePageSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
      <div className="min-w-[720px]">
        <div
          className="grid gap-4 border-b px-6 py-4"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(120px, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
        </div>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-4 px-6 py-4 items-center"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(120px, 1fr))` }}
            >
              {Array.from({ length: cols }).map((__, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className={
                    colIndex >= cols - 2
                      ? "h-6 w-11 rounded-full justify-self-center"
                      : "h-5 w-full"
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
