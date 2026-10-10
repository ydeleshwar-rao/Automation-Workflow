export default function AssetsLoading() {
  return (
    <div className="flex h-full max-h-screen flex-col gap-1 overflow-hidden bg-[hsl(var(--surface))] p-1 animate-pulse">
      {/* Header card */}
      <div className="shrink-0 rounded-2xl border border-border/60 bg-background px-6 py-4 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-5 w-20 rounded bg-muted" />
            <div className="h-3 w-64 rounded bg-muted" />
          </div>
        </div>
        {/* Tabs + search + button */}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-9 w-40 rounded-lg bg-muted" />
          <div className="h-9 flex-1 max-w-xs rounded-lg bg-muted" />
          <div className="h-9 w-32 rounded-lg bg-muted" />
        </div>
      </div>

      {/* Content card */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]">
        {/* Folder sidebar */}
        <aside className="w-[280px] shrink-0 border-r border-border/60 bg-muted/20 p-3 space-y-2">
          <div className="h-8 w-full rounded-lg bg-muted" />
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg px-2 py-2"
            >
              <div className="h-4 w-4 rounded bg-muted" />
              <div className="h-3 rounded bg-muted" style={{ width: `${55 + (i % 3) * 15}%`, opacity: 1 - i * 0.08 }} />
            </div>
          ))}
        </aside>

        {/* Workflow table area */}
        <div className="flex-1 p-4 space-y-3 overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-4 pb-2 border-b border-border/60">
            <div className="h-3 w-40 rounded bg-muted" />
            <div className="ml-auto h-3 w-20 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
          {/* Table rows */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-border/40 bg-muted/30 px-4 py-3"
              style={{ opacity: 1 - i * 0.09 }}
            >
              <div className="h-7 w-7 rounded-lg bg-muted" />
              <div className="h-3 w-48 rounded bg-muted" />
              <div className="ml-auto h-5 w-16 rounded-full bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-7 w-7 rounded-lg bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
