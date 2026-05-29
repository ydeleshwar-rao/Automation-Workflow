"use client";

import { Bell } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ProfileDropdown } from "@/src/components/dashboard/profile/ui/profile-dropdown";
import { HeaderAccountSwitcher } from "./header-account-switcher";
import Link from "next/link";

export function DashboardHeader() {
  return (
    <header className="bg-[hsl(var(--surface))] px-4 py-1.5 sm:px-3">
      <div className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-1 shadow-sm">
        <Link href="/dashboard" className="flex items-center px-3">
          <span className="text-lg font-bold tracking-tight text-foreground">
            Job Management
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Account Switcher — visible in header for admin/developer */}
          <HeaderAccountSwitcher />

          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full border border-border text-muted-foreground hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Button>
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
