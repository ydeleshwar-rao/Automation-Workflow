"use client";

import { CommusoftJobsView } from "@/src/components/app-connections/commusoft/ui/commusoft-jobs-view";

export default function CommusoftDashboardPage() {
  return (
    <div className="flex-1 overflow-hidden bg-[hsl(var(--surface))]">
      <CommusoftJobsView />
    </div>
  );
}
