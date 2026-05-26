"use client";

import { useLeadsHubContacts } from "../hooks/useLeadsHubContacts";
import { DashboardPageSkeleton } from "@/src/components/ui/skeleton-loader";

export function LeadsHubContactsView() {
  const {
    paginatedContacts,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
  } = useLeadsHubContacts();

  if (isLoading) {
    return <DashboardPageSkeleton metricCount={0} rowCount={5} />;
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-[#faf8f5] dark:bg-background min-h-full font-sans text-[#333] dark:text-foreground">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table Container Placeholder */}
      <div className="bg-white dark:bg-card border border-[#ddd] dark:border-border overflow-hidden shadow-sm flex flex-col rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Leads Hub Integration UI</h3>
        <p className="text-muted-foreground mb-4">
          The complex UI files for leads hub table and pagination were not included in the dynamic UI checkout. This is a placeholder to prevent build errors.
        </p>
        <ul className="list-disc pl-5">
          {paginatedContacts.map((c: any) => (
            <li key={c.id}>{c.first_name} {c.last_name} - {c.email}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
