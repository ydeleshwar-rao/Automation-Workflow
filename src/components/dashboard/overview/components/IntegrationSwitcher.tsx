"use client";

import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  type AppId,
  selectActiveApp,
  selectAppStatus,
  setActiveApp,
} from "@/src/store/appStatusSlice";
import { listAvailableProviders } from "@/src/services/integrations/registry";

/**
 * Pill switcher rendered in the dashboard header. Lists every integration that
 * (a) has a registered provider AND (b) is currently connected for this user.
 * Clicking a pill flips `activeApp` in the store, which automatically retriggers
 * the dashboard's data fetch.
 */
export function IntegrationSwitcher() {
  const dispatch = useAppDispatch();
  const activeApp = useAppSelector(selectActiveApp);
  const status = useAppSelector(selectAppStatus);

  const options = useMemo(() => {
    const all = listAvailableProviders();
    return all.filter((p) => status[p.appId]);
  }, [status]);

  if (options.length === 0) return null;

  // Only one connected app — show a static badge instead of a switcher.
  if (options.length === 1) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border border-border rounded-xl px-3 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <span>{options[0].label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {options.map((p) => {
        const isActive = activeApp === p.appId;
        return (
          <button
            key={p.appId}
            onClick={() => dispatch(setActiveApp(p.appId as AppId))}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
