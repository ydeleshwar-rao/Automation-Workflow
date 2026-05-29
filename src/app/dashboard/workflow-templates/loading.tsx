export default function WorkflowTemplatesLoading() {
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 p-6 animate-pulse">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <div className="h-8 w-8 rounded-lg border border-border bg-muted shrink-0" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-muted" />
              <div className="h-5 w-44 rounded bg-muted" />
            </div>
            <div className="h-3 w-72 rounded bg-muted" />
          </div>
        </div>
        {/* Refresh button */}
        <div className="h-8 w-20 rounded-lg border border-border bg-muted" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 lg:flex-row lg:items-center">
        {/* Scope tabs */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
          <div className="h-7 w-24 rounded-md bg-muted" />
          <div className="h-7 w-16 rounded-md bg-muted/60" />
          <div className="h-7 w-12 rounded-md bg-muted/60" />
        </div>
        {/* Search */}
        <div className="h-10 flex-1 rounded-md border border-border bg-muted" />
        {/* Dropdowns */}
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-muted" />
          <div className="h-8 w-32 rounded-md border border-border bg-muted" />
          <div className="h-8 w-28 rounded-md border border-border bg-muted" />
        </div>
      </div>

      {/* Template card grid — 6 cards, 3 cols */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 0.85, 0.7, 0.6, 0.5, 0.4].map((opacity, i) => (
            <TemplateCardSkeleton key={i} opacity={opacity} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateCardSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <div
      className="flex flex-col rounded-xl border border-border/60 bg-background p-4 shadow-sm"
      style={{ opacity }}
    >
      {/* Top row: name + badges + menu */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-16 rounded-md bg-muted" />
            <div className="h-4 w-14 rounded-md bg-muted" />
          </div>
        </div>
        <div className="h-6 w-6 rounded-md bg-muted shrink-0" />
      </div>

      {/* Description lines */}
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="h-7 w-24 rounded-md bg-muted" />
      </div>
    </div>
  );
}
