"use client";

/**
 * IntegrationContext.tsx
 * ─────────────────────────────────────────────────────────────
 * Provides integration connection status and user role/permissions
 * to the dashboard sidebar and other consumers.
 *
 * Architecture changes:
 *   - Removed all direct Supabase calls
 *   - Removed clientkey concept entirely
 *   - Permissions come from Redux accessSlice (seeded from JWT on login)
 *   - Integration status fetched via JWT-authenticated requests (no clientkey header)
 */

import React, { createContext, useContext, useEffect, useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  fetchAppStatus,
  selectAppStatus,
  selectConnectedServices,
} from "@/src/store/appStatusSlice";
import type { RootState } from "@/src/store/store";
import { hasPageAccess } from "@/src/store/accessSlice";

// ── Context shape ─────────────────────────────────────────────────────────────

interface IntegrationStatus {
  isServiceM8Connected: boolean;
  isCommusoftConnected: boolean;
  isLeadsHubConnected:  boolean;
  isSimProConnected:    boolean;
  /** 'admin' | 'developer' | null (null while loading) */
  userRole:             string | null;
  /** true when the user has access to a given page key */
  canAccessPage:        (pageKey: string) => boolean;
  isLoading:            boolean;
  hasLoadedOnce:        boolean;
  connectedServices:    string[];
}

interface IntegrationContextType extends IntegrationStatus {
  refreshStatus: () => Promise<void>;
}

const IntegrationContext = createContext<IntegrationContextType | undefined>(
  undefined
);

// ── Provider ─────────────────────────────────────────────────────────────────

export function IntegrationProvider({ children }: { children: React.ReactNode }) {
  const dispatch           = useAppDispatch();
  const appStatus          = useAppSelector(selectAppStatus);
  const connectedServices  = useAppSelector(selectConnectedServices);
  const accessUser         = useAppSelector((s: RootState) => s.access.user);
  const accessStatus       = useAppSelector((s: RootState) => s.access.status);

  const hasFetchedOnMountRef = useRef(false);

  // ── Fetch integration statuses ────────────────────────────────────────────
  // Only fire once the access state is ready (JWT available in storage)
  const fetchStatus = useCallback(async () => {
    await dispatch(fetchAppStatus()).unwrap().catch(() => undefined);
  }, [dispatch]);

  useEffect(() => {
    // Wait for JWT to be ready before fetching integration status
    if (accessStatus !== "ready") return;
    if (hasFetchedOnMountRef.current) return;

    hasFetchedOnMountRef.current = true;
    void fetchStatus();

    const handleRefresh = () => void fetchStatus();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void fetchStatus();
    };

    window.addEventListener("refresh-integrations", handleRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("refresh-integrations", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accessStatus, fetchStatus]);

  // ── Permission helper ─────────────────────────────────────────────────────
  const canAccessPage = useCallback(
    (pageKey: string): boolean => {
      if (!accessUser) return false;
      return hasPageAccess(accessUser.permissions, pageKey);
    },
    [accessUser]
  );

  const isLoading     = appStatus.isLoading && !appStatus.hasLoadedOnce;
  const hasLoadedOnce = appStatus.hasLoadedOnce;

  return (
    <IntegrationContext.Provider
      value={{
        isServiceM8Connected: appStatus.servicem8,
        isCommusoftConnected: appStatus.commusoft,
        isLeadsHubConnected:  appStatus.leadshub,
        isSimProConnected:    appStatus.simpro,
        userRole:             accessUser?.role ?? null,
        canAccessPage,
        isLoading,
        hasLoadedOnce,
        connectedServices,
        refreshStatus:        fetchStatus,
      }}
    >
      {children}
    </IntegrationContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useIntegrationContext() {
  const context = useContext(IntegrationContext);
  if (context === undefined) {
    throw new Error(
      "useIntegrationContext must be used within an IntegrationProvider"
    );
  }
  return context;
}
