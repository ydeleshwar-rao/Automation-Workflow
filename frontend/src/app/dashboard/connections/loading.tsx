export default function ConnectionsLoading() {
  return (
    <div className="mr-[4px] w-[calc(100%_-_7px)] space-y-4 p-[4px] animate-pulse">

      {/* Header — matches gradient banner */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-background via-accent/20 to-background px-5 py-4 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div className="h-8 w-40 rounded-lg bg-muted" />
          <div className="h-6 w-28 rounded-lg bg-muted" />
        </div>
        <div className="mt-2 h-3 w-32 rounded bg-muted" />
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/90 p-3 shadow-[0_2px_14px_0_hsl(var(--foreground)/0.05)] sm:flex-row">
        <div className="h-11 flex-1 rounded-xl bg-muted" />
        <div className="h-11 w-16 rounded-xl bg-muted" />
      </div>

      {/* Category groups */}
      <div className="flex flex-col gap-8">

        {/* Lead Management — 1 card */}
        <div className="space-y-4 rounded-2xl border border-border/60 bg-background/85 p-4 shadow-[0_2px_14px_0_hsl(var(--foreground)/0.05)]">
          <div className="h-7 w-40 rounded-lg bg-muted" />
          <div className="flex flex-col gap-3">
            <IntegrationCardSkeleton />
          </div>
        </div>

        {/* Job Management — 3 cards */}
        <div className="space-y-4 rounded-2xl border border-border/60 bg-background/85 p-4 shadow-[0_2px_14px_0_hsl(var(--foreground)/0.05)]">
          <div className="h-7 w-36 rounded-lg bg-muted" />
          <div className="flex flex-col gap-3">
            <IntegrationCardSkeleton />
            <IntegrationCardSkeleton opacity={0.8} />
            <IntegrationCardSkeleton opacity={0.6} />
          </div>
        </div>

      </div>
    </div>
  );
}

function IntegrationCardSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <div
      className="relative w-full min-h-[80px] rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm flex"
      style={{ opacity }}
    >
      {/* Left colored panel — matches w-[80px] min-h-[80px] colored block */}
      <div className="w-[80px] shrink-0 self-stretch bg-muted/60 flex items-center justify-center">
        {/* White icon box inside panel */}
        <div className="w-12 h-12 rounded-lg bg-background/80 shadow border border-border/20" />
      </div>

      {/* Right content */}
      <div className="flex flex-1 items-center px-6 md:px-8">
        <div className="flex flex-1 items-center justify-between gap-8">
          {/* Name + category */}
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-2.5 w-24 rounded bg-muted" />
          </div>

          {/* Status badge + action buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-6 w-28 rounded-full bg-muted" />
            <div className="h-7 w-20 rounded-lg bg-muted" />
            <div className="h-7 w-7 rounded-md bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
