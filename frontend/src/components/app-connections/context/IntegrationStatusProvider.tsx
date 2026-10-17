"use client";

import { useEffect, type ReactNode } from "react";
import { useAppSelector } from "@/src/store/hooks";
import type { RootState } from "@/src/store/store";
import { useGetIntegrationStatusesQuery } from "../apiIntegrations/integrationsApi";

const ACCESS_READY_STATUS = "ready";

/**
 * Keeps the integration statuses loaded app-wide (sidebar, dashboard switcher, selectors)
 * once the user is signed in, and refreshes them when the tab becomes visible again,
 * since connections are often changed in another tab or in the provider's own UI.
 */
export function IntegrationStatusProvider({ children }: { children: ReactNode }) {
  const accessStatus = useAppSelector((state: RootState) => state.access.status);
  const isSignedIn = accessStatus === ACCESS_READY_STATUS;

  // refetchOnMountOrArgChange: a new sign-in must not reuse statuses reset at logout.
  const { refetch } = useGetIntegrationStatusesQuery(undefined, {
    skip: !isSignedIn,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (!isSignedIn) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isSignedIn, refetch]);

  return <>{children}</>;
}
