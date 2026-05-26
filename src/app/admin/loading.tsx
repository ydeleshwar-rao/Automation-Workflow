export default function AdminLoading() {
  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto animate-pulse">
      {/* Back link */}
      <div className="h-4 w-28 bg-muted rounded" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 bg-background p-5 flex items-start gap-4 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]"
          >
            <div className="h-11 w-11 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-2.5 w-24 bg-muted rounded" />
              <div className="h-7 w-16 bg-muted rounded" />
              <div className="h-2 w-32 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <div className="h-4 w-28 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background p-5 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]"
            >
              <div className="h-12 w-12 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 bg-muted rounded" />
                <div className="h-2.5 w-48 bg-muted rounded" />
              </div>
              <div className="h-4 w-4 rounded bg-muted shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
