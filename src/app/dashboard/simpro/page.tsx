"use client";

import { SimproJobsView } from "@/src/components/app-connections/simpro/ui/simpro-jobs-view";

export default function SimproDashboardPage() {
  return (
    <div className="flex-1 bg-[hsl(var(--surface))]">
      <SimproJobsView />
    </div>
  );
}
