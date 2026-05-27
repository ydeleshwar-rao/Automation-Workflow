"use client";

/**
 * DashboardSidebar — modular, neumorphic, collapsible
 * ─────────────────────────────────────────────────────────────
 * Top:  toggle button (open / close)
 * Mid:  nav items  — ONE NavItem handles both expanded & collapsed
 * Bot:  (empty — bell + profile live in TopBar)
 *
 * Neumorphism:
 *   Active   → nm-inset  (carved in / pressed)
 *   Inactive → nm-btn    (raised / lifted on hover)
 *
 * Shell animates the aside width; this component fills w-full h-full.
 */

import Link            from "next/link";
import { usePathname } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

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

// ── Surface bg token (same as sidebar, required for nm shadows) ─
const SURF = "bg-[hsl(var(--surface))]";

// ─────────────────────────────────────────────────────────────
// Tooltip — only shown in collapsed mode
// ─────────────────────────────────────────────────────────────
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip w-full flex justify-center">
      {children}
      <div
        className={cn(
          "pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[90]",
          "px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
          "bg-popover text-popover-foreground border border-border/40 shadow-xl",
          "opacity-0 -translate-x-2 transition-all duration-150 ease-out",
          "group-hover/tip:opacity-100 group-hover/tip:translate-x-0"
        )}
      >
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-border/40" />
        <span className="absolute right-full top-1/2 -translate-y-1/2 translate-x-px border-[4px] border-transparent border-r-popover" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NavItem — single component for BOTH states
// Active  → nm-inset (pressed in)  + primary accent bar
// Inactive→ nm-btn   (raised)      + muted text, lifts on hover
// ─────────────────────────────────────────────────────────────
function NavItem({
  item,
  isActive,
  isOpen,
}: {
  item:     NavItemConfig;
  isActive: boolean;
  isOpen:   boolean;
}) {
  const link = (
    <Link
      href={item.href}
      className={cn(
        // Base
        "relative flex items-center rounded-xl transition-all duration-200 select-none",
        SURF,
        // Active → inset + tinted bg + primary text
        isActive && [
          "nm-inset",
          "bg-primary/[0.12]",
          "text-primary",
        ],
        // Inactive → raised + muted text
        !isActive && [
          "nm-btn",
          "text-muted-foreground",
          "hover:text-foreground",
        ],
        // Layout: collapsed square / expanded row
        !isOpen && "justify-center w-10 h-10",
        isOpen  && "w-full gap-3 px-4 py-2.5",
      )}
    >
      {/* Left accent bar — expanded active only */}
      {isActive && isOpen && (
        <span
          className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-full bg-primary"
          aria-hidden
        />
      )}

      <item.icon
        className="shrink-0 h-[18px] w-[18px]"
        strokeWidth={isActive ? 2.5 : 2}
      />

      {isOpen && (
        <span className="truncate text-[13.5px] font-medium leading-none">
          {item.name}
        </span>
      )}
    </Link>
  );

  return isOpen ? link : <Tooltip label={item.name}>{link}</Tooltip>;
}

// ─────────────────────────────────────────────────────────────
// Skeleton — mirrors NavItem shape for both states
// ─────────────────────────────────────────────────────────────
function NavSkeleton({ isOpen }: { isOpen: boolean }) {
  return (
    <>
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl bg-muted/40 animate-pulse shrink-0",
            !isOpen && "w-10 h-10 mx-auto",
            isOpen  && "w-full h-10"
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
  const pathname          = usePathname();
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

      {/* ── Top: toggle button ── */}
      <div className="h-14 shrink-0 flex items-center px-3">
        <Tooltip label={isOpen ? "Collapse menu" : "Expand menu"}>
          <button
            onClick={toggle}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            className={cn(
              "flex items-center rounded-xl transition-all duration-200",
              SURF,
              "nm-btn text-muted-foreground hover:text-foreground",
              isOpen  ? "gap-3 px-3 py-2.5 w-full" : "justify-center w-10 h-10"
            )}
          >
            {isOpen
              ? <PanelLeftClose className="shrink-0 h-[18px] w-[18px]" strokeWidth={2} />
              : <PanelLeftOpen  className="shrink-0 h-[18px] w-[18px]" strokeWidth={2} />
            }
            {isOpen && (
              <span className="truncate text-[13.5px] font-medium leading-none">
                Menu
              </span>
            )}
          </button>
        </Tooltip>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-border/40 mx-3 shrink-0" />

      {/* ── Nav items ── */}
      <nav className="flex-1 flex flex-col gap-2 py-3 px-3 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <NavSkeleton isOpen={isOpen} />
        ) : (
          navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href ||
                  pathname?.startsWith(item.href + "/");

            return (
              <NavItem
                key={item.id}
                item={item}
                isActive={isActive}
                isOpen={isOpen}
              />
            );
          })
        )}
      </nav>
    </div>
  );
}
