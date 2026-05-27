"use client";

import { useUser }   from "../hooks/useUser";
import { useTheme }  from "next-themes";
import { useSelector } from "react-redux";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { LogOut, User, Shield, Moon, Sun } from "lucide-react";
import type { RootState } from "@/src/store/store";

export function ProfileDropdown() {
  const { theme, setTheme } = useTheme();
  const { profile, initials, logout, navigateToAdmin, navigateToProfile } = useUser();
  const isDark = theme === "dark";

  const { user } = useSelector((s: RootState) => s.access);

  // Still loading
  if (profile === undefined) {
    return (
      <div className="ml-2 w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-bold text-sm ring-2 ring-background animate-pulse">
        …
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          suppressHydrationWarning
          className="ml-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground ring-2 ring-background transition-all hover:ring-border"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={14}
        className="w-64 border-border bg-popover p-0 shadow-xl"
      >
        <DropdownMenuSeparator className="my-0 opacity-50" />

        <div className="p-2">
          {/* Profile info */}
          <DropdownMenuItem
            onClick={navigateToProfile}
            className="h-auto cursor-pointer rounded-md px-3 py-2.5 text-foreground/70 transition-colors focus:bg-muted focus:text-foreground"
          >
            <User className="mr-3 h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold text-foreground">
                {profile?.full_name?.trim() || profile?.email || "My Account"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground capitalize">
                {profile?.role ?? "user"}
              </p>
            </div>
          </DropdownMenuItem>

          {/* Admin Panel — only for admin role */}
          {user?.role === "admin" && (
            <DropdownMenuItem
              onClick={navigateToAdmin}
              className="cursor-pointer rounded-md px-3 py-2.5 text-foreground/70 transition-colors focus:bg-muted focus:text-foreground"
            >
              <Shield className="mr-3 h-[18px] w-[18px] text-muted-foreground" />
              <span className="text-[14px] font-medium">Admin Panel</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="my-1.5 opacity-50" />

          {/* Theme toggle */}
          <DropdownMenuItem
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="cursor-pointer rounded-md px-3 py-2.5 text-foreground transition-colors focus:bg-muted"
          >
            {isDark ? (
              <Sun className="mr-3 h-[18px] w-[18px] text-muted-foreground" />
            ) : (
              <Moon className="mr-3 h-[18px] w-[18px] text-muted-foreground" />
            )}
            <span className="text-[14px] font-medium">
              {isDark ? "Light Mode" : "Dark Mode"}
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1.5 opacity-50" />

          {/* Log out */}
          <DropdownMenuItem
            onClick={() => void logout()}
            className="cursor-pointer rounded-md px-3 py-2.5 text-destructive transition-colors focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="mr-3 h-[18px] w-[18px] text-destructive" />
            <span className="text-[14px] font-medium">Log out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
