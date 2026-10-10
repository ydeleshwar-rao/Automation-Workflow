export default function WorkflowLoading() {
  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-1 bg-[hsl(var(--surface))] p-1 animate-pulse">
      {/* Navbar skeleton */}
      <div className="h-14 shrink-0 rounded-2xl border border-border/60 bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-muted" />
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="ml-3 h-8 w-40 rounded-lg bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 rounded-lg bg-muted" />
          <div className="h-8 w-20 rounded-lg bg-muted" />
          <div className="h-8 w-20 rounded-lg bg-muted" />
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background">
        {/* Left panel — workflow list */}
        <div className="w-[280px] shrink-0 border-r border-border/60 p-3 space-y-2">
          <div className="h-9 bg-muted rounded-lg" />
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-10 bg-muted/70 rounded-lg" style={{ opacity: 1 - i * 0.1 }} />
          ))}
        </div>

        {/* Canvas area */}
        <div className="flex-1 bg-muted/30 [background-image:radial-gradient(hsl(var(--foreground)/0.07)_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-muted" />
            <div className="h-3 w-40 rounded bg-muted" />
            <div className="h-3 w-56 rounded bg-muted" />
            <div className="h-8 w-32 rounded-lg bg-muted mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
