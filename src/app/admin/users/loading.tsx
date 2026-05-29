export default function AdminUsersLoading() {
  return (
    <div className="py-10 min-h-[80vh] flex items-start justify-center animate-pulse">
      <div className="w-full max-w-2xl mx-auto px-4">
        {/* Card shell — matches CreateUserForm's rounded-[2rem] card */}
        <div className="rounded-[2rem] border border-border bg-card shadow-2xl p-8 space-y-6">

          {/* Card header */}
          <div className="space-y-3 pb-6 border-b border-border">
            <div className="h-4 w-24 bg-muted rounded" /> {/* back link */}
            <div className="h-7 w-40 bg-muted rounded mt-4" /> {/* title */}
            <div className="h-3 w-56 bg-muted rounded" />    {/* description */}
          </div>

          {/* Form fields */}
          <div className="space-y-5">
            {/* Row 1: First + Last name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-10 w-full rounded-xl bg-muted" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-10 w-full rounded-xl bg-muted" />
              </div>
            </div>

            {/* Row 2: Email */}
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-muted rounded" />
              <div className="h-10 w-full rounded-xl bg-muted" />
            </div>

            {/* Row 3: Phone + Role */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-10 w-full rounded-xl bg-muted" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-10 w-full rounded-xl bg-muted" />
              </div>
            </div>

            {/* Row 4: Password + App */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="h-3 w-28 bg-muted rounded" />
                <div className="h-10 w-full rounded-xl bg-muted" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-32 bg-muted rounded" />
                <div className="h-10 w-full rounded-xl bg-muted" />
              </div>
            </div>

            {/* Row 5: Company */}
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-muted rounded" />
              <div className="h-10 w-full rounded-xl bg-muted" />
            </div>

            {/* Row 6: Website URL */}
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-10 w-full rounded-xl bg-muted" />
            </div>

            {/* Submit button */}
            <div className="h-12 w-full rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
