"use client";

/**
 * DashboardTopBar
 * ─────────────────────────────────────────────────────────────
 * Sits above the page content, spanning the full content column.
 * The sidebar toggle has moved INTO the sidebar (top slot).
 *
 *   Left  → app name / brand
 *   Right → bell notification  +  profile avatar dropdown
 *
 * Height = h-14 (56 px) — matches sidebar toggle row so both
 * baseline-align across the full width.
 */

import Link             from "next/link";
import { Bell, Zap }    from "lucide-react";
import { ProfileDropdown } from "@/src/components/dashboard/profile/ui/profile-dropdown";
import { cn }           from "@/src/lib/utils";

const SURF = "bg-[hsl(var(--surface))]";

export function DashboardTopBar() {
  return (
    <header className="nm-topbar shrink-0 h-14 flex items-center justify-between px-4 border-b border-border/20">

      {/* ── Left: brand ── */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 select-none"
      >
        <Zap className="w-5 h-5 text-primary shrink-0" strokeWidth={2.5} />
        <span className="text-sm font-bold text-foreground hidden sm:block">
          Job Management
        </span>
      </Link>

      {/* ── Right: bell + profile ── */}
      <div className="flex items-center gap-2">

        {/* Bell */}
        <button
          aria-label="Notifications"
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-xl",
            SURF, "nm-btn",
            "text-muted-foreground hover:text-foreground",
            "transition-all duration-200"
          )}
        >
          <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
        </button>

        {/* Profile — dropdown opens downward, right-aligned */}
        <ProfileDropdown
          side="bottom"
          align="end"
          sideOffset={10}
          compact
        />
      </div>
    </header>
  );
}
