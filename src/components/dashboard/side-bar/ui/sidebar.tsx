"use client";

/**
 * DashboardSidebar — modular, neumorphic, collapsible
 * ─────────────────────────────────────────────────────────────
 * nm-btn / nm-inset / nm-sidebar all embed their own background
 * (hsl(var(--surface))) via CSS, so no inline bg-* classes needed.
 *
 * Collapsed (w-16): icon only + tooltip
 * Expanded  (w-56): icon + label
 */

import Link            from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn }                  from "@/src/lib/utils";
import { getDashboardNavItems } from "../config/nav-items";
import type { NavItemConfig }   from "../config/nav-items";
import { useAppSelector }       from "@/src/store/hooks";
import {
  selectAppStatusLoaded,
  selectAppStatusLoading,
} from "@/src/store/appStatusSlice";
import type { RootState }       from "@/src/store/store";
import { useSidebar }           from "@/src/components/providers/sidebar-provider";

// ─────────────────────────────────────────────────────────────
// Tooltip (collapsed mode only)
// ─────────────────────────────────────────────────────────────
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip w-full flex justify-center">
      {children}
      <div className={cn(
        "pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[90]",
        "px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
        "bg-popover text-popover-foreground shadow-xl border border-border/20",
        "opacity-0 -translate-x-2 transition-all duration-150 ease-out",
        "group-hover/tip:opacity-100 group-hover/tip:translate-x-0"
      )}>
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-border/20" />
        <span className="absolute right-full top-1/2 -translate-y-1/2 translate-x-px border-[4px] border-transparent border-r-popover" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NavItem — single component, both states
// nm-btn/nm-inset embed the surface bg via CSS (no extra class needed)
// ─────────────────────────────────────────────────────────────
function NavItem({ item, isActive, isOpen }: { item: NavItemConfig; isActive: boolean; isOpen: boolean }) {
  const link = (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center rounded-2xl transition-all duration-200 select-none",
        // Active → carved into surface
        isActive  && "nm-inset text-primary",
        // Inactive → raised from surface
        !isActive && "nm-btn text-muted-foreground hover:text-foreground",
        // Layout
        !isOpen && "justify-center w-10 h-10",
        isOpen  && "w-full gap-3 px-4 py-2.5",
      )}
    >
      {/* Left accent for active expanded item */}
      {isActive && isOpen && (
        <span className="absolute left-0 top-[7px] bottom-[7px] w-[3px] rounded-r-full bg-primary" aria-hidden />
      )}
      <item.icon className="shrink-0 h-[18px] w-[18px]" strokeWidth={isActive ? 2.5 : 2} />
      {isOpen && (
        <span className="truncate text-[13.5px] font-medium leading-none">{item.name}</span>
      )}
    </Link>
  );
  return isOpen ? link : <Tooltip label={item.name}>{link}</Tooltip>;
}

// ─────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────
function NavSkeleton({ isOpen }: { isOpen: boolean }) {
  return (
    <>
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-2xl bg-black/8 dark:bg-white/5 animate-pulse shrink-0",
            !isOpen && "w-10 h-10 mx-auto",
            isOpen  && "w-full h-10",
          )}
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Main sidebar
// ─────────────────────────────────────────────────────────────
export function DashboardSidebar() {
  const pathname           = usePathname();
  const { isOpen, toggle } = useSidebar();

  const accessUser         = useAppSelector((s: RootState) => s.access.user);
  const accessStatus       = useAppSelector((s: RootState) => s.access.status);
  const appStatusLoading   = useAppSelector(selectAppStatusLoading);
  const appStatusLoaded    = useAppSelector(selectAppStatusLoaded);

  const navItems = getDashboardNavItems({
    userRole:    accessUser?.role ?? null,
    permissions: accessUser?.permissions ?? [],
  });

  const isLoading =
    accessStatus !== "ready" ||
    (appStatusLoading && !appStatusLoaded);

  return (
    <div className="nm-sidebar flex flex-col h-full w-full overflow-hidden">

      {/* ── Toggle button at top ── */}
      <div className="h-14 shrink-0 flex items-center px-3">
        <Tooltip label={isOpen ? "Collapse" : "Expand"}>
          <button
            onClick={toggle}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            className={cn(
              "flex items-center rounded-2xl transition-all duration-200",
              "nm-btn text-muted-foreground hover:text-foreground",
              isOpen  ? "gap-3 px-3 py-2.5 w-full" : "justify-center w-10 h-10",
            )}
          >
            {isOpen
              ? <PanelLeftClose className="shrink-0 h-[18px] w-[18px]" strokeWidth={2} />
              : <PanelLeftOpen  className="shrink-0 h-[18px] w-[18px]" strokeWidth={2} />
            }
            {isOpen && (
              <span className="truncate text-[13.5px] font-medium leading-none">Menu</span>
            )}
          </button>
        </Tooltip>
      </div>

      {/* ── Divider ── */}
      <div className="h-px mx-3 shrink-0 bg-black/10 dark:bg-white/5" />

      {/* ── Nav items ── */}
      <nav className="flex-1 flex flex-col gap-2 py-3 px-3 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <NavSkeleton isOpen={isOpen} />
        ) : (
          navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <NavItem key={item.id} item={item} isActive={isActive} isOpen={isOpen} />
            );
          })
        )}
      </nav>
    </div>
  );
}
