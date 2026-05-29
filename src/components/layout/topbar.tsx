"use client";

import Link              from "next/link";
import { Bell, Zap }     from "lucide-react";
import { ProfileDropdown } from "@/src/components/dashboard/profile/ui/profile-dropdown";

export function DashboardTopBar() {
  return (
    <header className="nm-topbar shrink-0 h-14 flex items-center justify-between px-4">

      {/* ── Left: brand ── */}
      <Link href="/dashboard" className="flex items-center gap-2 select-none">
        <Zap className="w-5 h-5 text-primary shrink-0" strokeWidth={2.5} />
        <span className="text-sm font-bold text-foreground hidden sm:block">
          Job Management
        </span>
      </Link>

      {/* ── Right: bell + profile ── */}
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="nm-btn flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
        </button>

        <ProfileDropdown side="bottom" align="end" sideOffset={10} compact />
      </div>
    </header>
  );
}
