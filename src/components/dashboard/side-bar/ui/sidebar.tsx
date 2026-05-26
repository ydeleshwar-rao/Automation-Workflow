"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { toast } from "sonner";

import { useSidebar } from "@/src/components/providers/sidebar-provider";
import { cn } from "@/src/lib/utils";
import { useIntegrations } from "../hooks/useIntegrations";
import { getDashboardNavItems } from "../config/nav-items";
import type { NavItemConfig } from "../config/nav-items";
import { useAppSelector } from "@/src/store/hooks";
import {
  selectIsServiceM8Connected,
  selectIsCommusoftConnected,
  selectIsLeadsHubConnected,
  selectIsSimProConnected,
  selectAppStatusLoaded,
  selectAppStatusLoading,
} from "@/src/store/appStatusSlice";
import type { RootState } from "@/src/store/store";

// ── Animated hamburger → X toggle ────────────────────────────
function SidebarToggle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      className={cn(
        "flex items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200 ease-out",
        isOpen ? "h-8 w-8" : "mx-auto h-10 w-10"
      )}
    >
      {isOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
    </button>
  );
}

// ── Tooltip for collapsed icons ───────────────────────────────
function NavTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      {/* Tooltip bubble */}
      <div className={cn(
        "pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[90]",
        "px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
        "bg-popover text-popover-foreground border border-border shadow-lg",
        "opacity-0 -translate-x-1 transition-all duration-150",
        "group-hover/tip:opacity-100 group-hover/tip:translate-x-0"
      )}>
        {label}
        {/* Arrow */}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-border" />
        <span className="absolute right-full top-1/2 -translate-y-1/2 translate-x-px border-[4px] border-transparent border-r-popover" />
      </div>
    </div>
  );
}

// Items that are always navigable — no client selection required.
const ALWAYS_ACCESSIBLE = new Set(["home", "admin"]);

// ── Single icon item (collapsed) ──────────────────────────────
function CollapsedNavItem({
  item,
  isActive,
  onBlock,
}: {
  item: NavItemConfig;
  isActive: boolean;
  onBlock?: () => void;
}) {
  const itemCls = cn(
    "flex items-center justify-center w-10 h-10 rounded-xl mx-auto transition-all duration-200",
    isActive
      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
      : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
  );
  return (
    <NavTooltip label={item.name}>
      {onBlock ? (
        <button type="button" onClick={onBlock} className={itemCls}>
          <item.icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
        </button>
      ) : (
        <Link href={item.href} className={itemCls}>
          <item.icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
        </Link>
      )}
    </NavTooltip>
  );
}

// ── Main sidebar ──────────────────────────────────────────────
export function DashboardSidebar() {
  const pathname  = usePathname();
  const { isOpen, toggle } = useSidebar();

  // Connection flags come straight from the Redux slice so the sidebar
  // re-renders the instant any app's connection status changes — no Context round-trip.
  const isServiceM8Connected = useAppSelector(selectIsServiceM8Connected);
  const isCommusoftConnected = useAppSelector(selectIsCommusoftConnected);
  const isLeadsHubConnected = useAppSelector(selectIsLeadsHubConnected);
  const isSimProConnected = useAppSelector(selectIsSimProConnected);
  const appStatusLoading = useAppSelector(selectAppStatusLoading);
  const appStatusLoaded = useAppSelector(selectAppStatusLoaded);

  // For admin/developer: a client must be explicitly selected before we show
  // any integration nav item. Without this guard, getActiveClientKey() falls back
  // to the admin's own clientKey, which may have an app connected — causing the
  // wrong integration to appear before a client is chosen.
  const selectedClientId = useAppSelector((s: RootState) => s.access.selectedClientId);

  // Role + permissions still come from IntegrationContext (profile-scoped state).
  const { userRole, pagePermissions, isLoading: permsLoading, hasLoadedOnce: permsLoaded } =
    useIntegrations();

  // Mask integration flags when no client is selected (admin/developer flow).
  // Regular users always have selectedClientId = their own userId after bootstrap.
  const clientSelected = !!selectedClientId;
  const isAdminOrDeveloper = userRole === "admin" || userRole === "developer";

  // Returns true when a nav item requires a client but none is selected.
  const isBlocked = (item: NavItemConfig) =>
    isAdminOrDeveloper && !clientSelected && !ALWAYS_ACCESSIBLE.has(item.id);

  const showClientToast = () =>
    toast.warning("No client selected", {
      description: "Please select a client from the top bar before accessing this section.",
      duration: 4000,
    });

  const navItems = getDashboardNavItems({
    isServiceM8Connected: clientSelected && isServiceM8Connected,
    isCommusoftConnected:  clientSelected && isCommusoftConnected,
    isLeadsHubConnected:   clientSelected && isLeadsHubConnected,
    isSimProConnected:     clientSelected && isSimProConnected,
    userRole, pagePermissions,
  });

  const hasLoadedOnce = permsLoaded && appStatusLoaded;
  const isLoading = permsLoading || (appStatusLoading && !appStatusLoaded);
  const isInitialLoading = !hasLoadedOnce && isLoading;

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [playInitialBounce, setPlayInitialBounce] = useState(false);
  const [hasPlayedInitialBounce, setHasPlayedInitialBounce] = useState(false);

  // Auto-expand active section on load
  useEffect(() => {
    const active = navItems.find(
      (item) => pathname === item.href || item.subItems?.some((s) => pathname === s.href)
    );
    if (active?.subItems && !expandedItems.includes(active.name)) {
      setExpandedItems((prev) => [...prev, active.name]);
    }
  }, [pathname, isServiceM8Connected, isCommusoftConnected, isLeadsHubConnected, isSimProConnected, pagePermissions]);

  useEffect(() => {
    if (!isOpen) setExpandedItems([]);
  }, [isOpen]);

  useEffect(() => {
    if (!isInitialLoading && !hasPlayedInitialBounce) {
      setPlayInitialBounce(true);
      setHasPlayedInitialBounce(true);
      const timer = setTimeout(() => setPlayInitialBounce(false), 700);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoading, hasPlayedInitialBounce]);

  const toggleExpand = (name: string) =>
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );

  // ── Shared card shell ──────────────────────────────────────
  // On mobile: no rounded corners (full-bleed drawer)
  // On desktop: floating card with rounded corners + shadow
  const cardClass = cn(
    "flex flex-col h-full bg-background overflow-hidden",
    "lg:rounded-2xl lg:border lg:border-border/60 lg:shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]"
  );

  // ── Collapsed (icon-only) ──────────────────────────────────
  if (!isOpen) {
    return (
      <aside className={cardClass}>
        {/* Toggle at top */}
        <div className="flex items-center justify-center border-b border-border/60 px-2 py-3">
          <SidebarToggle isOpen={false} onToggle={toggle} />
        </div>
        <nav className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden py-2 flex flex-col items-center gap-1.5",
          playInitialBounce && "animate-sidebar-bounce-in"
        )}>
          {isInitialLoading &&
            [...Array(6)].map((_, i) => (
              <div
                key={`collapsed-skeleton-${i}`}
                className="mx-auto h-10 w-10 rounded-xl border border-border/50 bg-muted/70 animate-pulse"
              >
                <div className="flex h-full w-full items-center justify-center">
                  <div className="h-4 w-4 rounded-sm bg-muted-foreground/30" />
                </div>
              </div>
            ))}
          {!isInitialLoading && navItems.map((item) => {
            const isActive =
              pathname === item.href || item.subItems?.some((s) => pathname === s.href);
            return (
              <CollapsedNavItem
                key={item.name}
                item={item}
                isActive={!!isActive}
                onBlock={isBlocked(item) ? showClientToast : undefined}
              />
            );
          })}
        </nav>
      </aside>
    );
  }

  // ── Expanded ───────────────────────────────────────────────
  return (
    <aside className={cn(cardClass, "w-[216px]")}>
      {/* Toggle at top */}
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-3">
        <span className="text-sm font-semibold text-foreground/70 tracking-wide">Menu</span>
        <SidebarToggle isOpen={true} onToggle={toggle} />
      </div>
      <nav className={cn(
        "flex-1 overflow-y-auto px-3 py-2 space-y-0.5",
        !isInitialLoading && "animate-in fade-in slide-in-from-left-1 duration-300",
        playInitialBounce && "animate-sidebar-bounce-in"
      )}>
        {isInitialLoading &&
          [...Array(6)].map((_, i) => (
            <div
              key={`expanded-skeleton-${i}`}
              className="w-full rounded-xl border border-border/50 bg-muted/70 px-3 py-2.5 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-muted-foreground/25" />
                <div className="h-3 w-24 rounded bg-muted-foreground/25" />
              </div>
            </div>
          ))}
        {!isInitialLoading && navItems.map((item) => {
          const isItemActive =
            pathname === item.href || item.subItems?.some((s) => pathname === s.href);
          const isExpanded = expandedItems.includes(item.name);
          const blocked = isBlocked(item);

          const iconSpanCls = cn(
            "flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all",
            isItemActive
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
              : "bg-muted/60 text-foreground/60"
          );
          const rowCls = cn(
            "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-150",
            isItemActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          );

          return (
            <div key={item.name} className="space-y-0.5">
              {item.subItems ? (
                <button
                  onClick={() => toggleExpand(item.name)}
                  className={rowCls}
                >
                  <span className={iconSpanCls}>
                    <item.icon className="h-4 w-4" strokeWidth={isItemActive ? 2.5 : 2} />
                  </span>
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronRight className={cn(
                    "w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200",
                    isExpanded && "rotate-90"
                  )} />
                </button>
              ) : blocked ? (
                <button
                  type="button"
                  onClick={showClientToast}
                  className={rowCls}
                >
                  <span className={iconSpanCls}>
                    <item.icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="flex-1 text-left">{item.name}</span>
                </button>
              ) : (
                <Link href={item.href} className={rowCls}>
                  <span className={iconSpanCls}>
                    <item.icon className="h-4 w-4" strokeWidth={isItemActive ? 2.5 : 2} />
                  </span>
                  <span>{item.name}</span>
                </Link>
              )}

              {item.subItems && isExpanded && (
                <div className="ml-10 mt-0.5 space-y-0.5">
                  {item.subItems.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    const subCls = cn(
                      "block w-full text-left py-2 px-3 text-[13px] rounded-lg transition-colors",
                      isSubActive
                        ? "text-primary font-semibold bg-primary/8"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    );
                    return blocked ? (
                      <button key={sub.name} type="button" onClick={showClientToast} className={subCls}>
                        {sub.name}
                      </button>
                    ) : (
                      <Link key={sub.name} href={sub.href} className={subCls}>
                        {sub.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
