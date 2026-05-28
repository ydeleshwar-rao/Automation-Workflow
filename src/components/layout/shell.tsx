"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import { useSidebar } from "@/src/components/providers/sidebar-provider";

interface ShellProps {
  children:  React.ReactNode;
  sidebar:   React.ReactNode;
  topbar:    React.ReactNode;
}

export function Shell({ children, sidebar, topbar }: ShellProps) {
  const pathname       = usePathname();
  const { isOpen }     = useSidebar();
  const isWorkflowPage =
    pathname?.startsWith("/dashboard/workflow") ||
    pathname?.startsWith("/dashboard/ai-workflow/");

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--surface))]">

      {/* ── Animated sidebar ── */}
      <aside
        className={cn(
          "shrink-0 h-full z-50",
          "transition-[width] duration-300 ease-in-out",
          isOpen ? "w-56" : "w-16"
        )}
      >
        {sidebar}
      </aside>

      {/* ── Main content column ── */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* Top bar */}
        {topbar}

        {/* Page content */}
        <main
          className={cn(
            "flex-1 min-w-0",
            isWorkflowPage ? "overflow-hidden" : "overflow-y-auto"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
