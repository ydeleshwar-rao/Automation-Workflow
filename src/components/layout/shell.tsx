"use client";

import { useSidebar } from "@/src/components/providers/sidebar-provider";
import { cn } from "@/src/lib/utils";
import { usePathname } from "next/navigation";

interface ShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header: React.ReactNode;
}

export function Shell({ children, sidebar, header }: ShellProps) {
  const { isOpen, setIsOpen } = useSidebar();
  const pathname = usePathname();
  const isWorkflowPage = pathname === "/dashboard/workflow";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[hsl(var(--surface))] font-sans">
      {header}

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-[60] lg:hidden animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
          />
        )}

        <div
          className={cn(
            "flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
            "fixed inset-y-0 left-0 z-[70] pt-[calc(72px+0.375rem)] bg-background",
            "lg:relative lg:bg-transparent lg:px-3 lg:pb-3 lg:pt-0.5",
            isOpen
              ? "w-[232px] translate-x-0"
              : "-translate-x-full lg:translate-x-0 lg:w-[84px] w-[230px]"
          )}
        >
          {sidebar}
        </div>

        <main className={cn(
          "flex-1 min-w-0 overflow-y-auto lg:pr-3 lg:pb-3 lg:pt-0.5",
          isWorkflowPage && "overflow-hidden"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
