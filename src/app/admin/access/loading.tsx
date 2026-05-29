export default function AdminAccessLoading() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Back link */}
      <div className="h-4 w-28 bg-muted rounded" />

      {/* Title + description */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-3.5 w-80 bg-muted rounded" />
      </div>

      {/* Tab bar */}
      <div className="border-b border-border flex gap-1">
        <div className="h-9 w-44 bg-muted rounded-t-lg" />
        <div className="h-9 w-28 bg-muted/50 rounded-t-lg" />
      </div>

      {/* Table header */}
      <div className="flex items-center gap-4 px-4 py-2">
        <div className="h-3 w-32 bg-muted rounded" />
        <div className="ml-auto h-3 w-24 bg-muted rounded" />
        <div className="h-3 w-20 bg-muted rounded" />
      </div>

      {/* Table rows */}
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-border/50 bg-background px-4 py-3"
            style={{ opacity: 1 - i * 0.08 }}
          >
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-36 bg-muted rounded" />
              <div className="h-2.5 w-48 bg-muted rounded" />
            </div>
            <div className="h-6 w-20 rounded-full bg-muted" />
            <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
