"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/src/lib/supabase/client";
import axiosInstance from "@/src/services/apiClient";
import { loadProfile, getActiveClientKey, loadSelectedClientId } from "@/src/store/localStorage";
import {
  DEFAULT_PERMISSIONS,
  type PagePermissions,
} from "@/src/types/permissions.types";
import { API_ROUTES } from "@/src/constants/api.constants";
import type { PermissionRecord } from "@/src/components/admin/access/apiIntegrations/accessApi";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  fetchAppStatus,
  selectAppStatus,
  selectConnectedServices,
} from "@/src/store/appStatusSlice";

interface IntegrationStatus {
  isServiceM8Connected: boolean;
  isCommusoftConnected: boolean;
  isLeadsHubConnected: boolean;
  isSimProConnected: boolean;
  userRole: string | null;
  pagePermissions: PagePermissions;
  isLoading: boolean;
  hasLoadedOnce: boolean;
  connectedServices: string[];
}

interface IntegrationContextType extends IntegrationStatus {
  refreshStatus: () => Promise<void>;
}

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

export function IntegrationProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const appStatus = useAppSelector(selectAppStatus);
  const connectedServices = useAppSelector(selectConnectedServices);

  const hasFetchedOnMountRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const profileRef = useRef<{
    userRole: string | null;
    pagePermissions: PagePermissions;
    clientKey: string | null;
  }>({
    userRole: null,
    pagePermissions: DEFAULT_PERMISSIONS,
    clientKey: null,
  });
  const sm8WasActiveRef = useRef(false);
  const csWasActiveRef = useRef(false);
  const ghlWasActiveRef = useRef(false);

  const [permissionsState, setPermissionsState] = useState<{
    userRole: string | null;
    pagePermissions: PagePermissions;
    isLoading: boolean;
    hasLoadedOnce: boolean;
  }>({
    userRole: null,
    pagePermissions: DEFAULT_PERMISSIONS,
    isLoading: true,
    hasLoadedOnce: false,
  });

  const fetchProfilePermissions = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const storedProfile = loadProfile();
      const userId = user?.id ?? storedProfile?.userId ?? "";

      if (!userId) {
        profileRef.current = {
          userRole: null,
          pagePermissions: DEFAULT_PERMISSIONS,
          clientKey: null,
        };
        setPermissionsState((prev) => ({
          ...prev,
          userRole: null,
          pagePermissions: DEFAULT_PERMISSIONS,
        }));
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, clientkey")
        .eq("id", userId)
        .single();

      const userRole = profile?.role || null;
      const clientKey = (profile as Record<string, unknown>)?.clientkey as string | null ?? null;

      // Admins get all permissions by default
      let pagePermissions: PagePermissions = { ...DEFAULT_PERMISSIONS };

      if (userRole === "developer") {
        // Developers: fetch per-client permissions
        const selectedClientId = loadSelectedClientId();
        if (selectedClientId) {
          try {
            const { data: permResp } = await axiosInstance.get(
              API_ROUTES.ACCESS.DEVELOPER_PERMISSIONS(userId, selectedClientId)
            );
            const permRecords: PermissionRecord[] = permResp?.data ?? [];
            pagePermissions = Object.keys(DEFAULT_PERMISSIONS).reduce(
              (acc, key) => ({ ...acc, [key]: false }),
              {} as PagePermissions
            );
            for (const record of permRecords) {
              if (record.page in pagePermissions) {
                (pagePermissions as unknown as Record<string, boolean>)[record.page] = record.can_read;
              }
            }
          } catch {
            // No permissions configured yet — show nothing
            pagePermissions = Object.keys(DEFAULT_PERMISSIONS).reduce(
              (acc, key) => ({ ...acc, [key]: false }),
              {} as PagePermissions
            );
          }
        } else {
          // No client selected — show nothing
          pagePermissions = Object.keys(DEFAULT_PERMISSIONS).reduce(
            (acc, key) => ({ ...acc, [key]: false }),
            {} as PagePermissions
          );
        }
      } else if (userRole !== "admin") {
        // Regular users: fetch global permissions
        try {
          const { data: permResp } = await axiosInstance.get(
            API_ROUTES.ACCESS.PERMISSIONS(userId)
          );
          const permRecords: PermissionRecord[] = permResp?.data ?? [];
          pagePermissions = Object.keys(DEFAULT_PERMISSIONS).reduce(
            (acc, key) => ({ ...acc, [key]: false }),
            {} as PagePermissions
          );
          for (const record of permRecords) {
            if (record.page in pagePermissions) {
              (pagePermissions as unknown as Record<string, boolean>)[record.page] = record.can_read;
            }
          }
        } catch {
          pagePermissions = { ...DEFAULT_PERMISSIONS };
        }
      }

      profileRef.current = { userRole, pagePermissions, clientKey };
      setPermissionsState((prev) => ({
        ...prev,
        userRole,
        pagePermissions,
      }));
    } catch (error) {
      console.error("Failed to fetch profile permissions:", error);
      profileRef.current = {
        userRole: profileRef.current.userRole,
        pagePermissions: DEFAULT_PERMISSIONS,
        clientKey: profileRef.current.clientKey,
      };
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    // ALWAYS dispatch a fresh app-status refetch — the slice dedupes by
    // `lastRequestId` so stale in-flight responses never overwrite a newer
    // post-connect/disconnect refetch. Do NOT gate this behind inFlightRef;
    // that would silently swallow the user's manual refetch.
    const appStatusPromise = dispatch(fetchAppStatus())
      .unwrap()
      .catch(() => undefined);

    // Dedupe ONLY the permissions fetch — it's expensive and never races with
    // user-driven state changes on this page.
    if (!inFlightRef.current) {
      setPermissionsState((prev) => ({ ...prev, isLoading: true }));
      inFlightRef.current = (async () => {
        try {
          await fetchProfilePermissions();
        } catch (error) {
          console.error("Failed to fetch profile permissions:", error);
        } finally {
          setPermissionsState((prev) => ({
            ...prev,
            userRole: profileRef.current.userRole,
            pagePermissions: profileRef.current.pagePermissions,
            isLoading: false,
            hasLoadedOnce: true,
          }));
          inFlightRef.current = null;
        }
      })();
    }

    await Promise.all([appStatusPromise, inFlightRef.current]);
  }, [dispatch, fetchProfilePermissions]);

  // Fire off sync side-effects (whose fire-on-edge semantics used to live in
  // each per-app hook) whenever a new "connected" edge is observed in the slice.
  useEffect(() => {
    const clientkey = getActiveClientKey();
    if (!clientkey) return;

    if (appStatus.servicem8 && !sm8WasActiveRef.current) {
      sm8WasActiveRef.current = true;
      axiosInstance
        .post(API_ROUTES.SERVICEM8.SYNC, {}, { headers: { clientkey } })
        .catch((err) => console.error("[ServiceM8] Auto-sync failed:", err));
    }
    if (!appStatus.servicem8) sm8WasActiveRef.current = false;

    if (appStatus.commusoft && !csWasActiveRef.current) {
      csWasActiveRef.current = true;
      axiosInstance
        .post(API_ROUTES.COMMUSOFT.SYNC, {}, { headers: { clientkey } })
        .catch((err) => console.error("[Commusoft] Auto-sync failed:", err));
    }
    if (!appStatus.commusoft) csWasActiveRef.current = false;

    if (appStatus.leadshub && !ghlWasActiveRef.current) {
      ghlWasActiveRef.current = true;
      axiosInstance
        .post(API_ROUTES.GHL.SYNC, {}, { headers: { clientkey } })
        .catch((err) => console.error("[LeadsHub] Auto-sync failed:", err));
    }
    if (!appStatus.leadshub) ghlWasActiveRef.current = false;
  }, [appStatus.servicem8, appStatus.commusoft, appStatus.leadshub]);

  useEffect(() => {
    if (!hasFetchedOnMountRef.current) {
      hasFetchedOnMountRef.current = true;
      void fetchStatus();
    }

    const handleRefresh = () => {
      void fetchStatus();
    };
    // Refetch when user returns to the tab — lets the UI catch up after an
    // OAuth popup flow or a client-switch in another tab.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchStatus();
      }
    };
    window.addEventListener("refresh-integrations", handleRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("refresh-integrations", handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchStatus]);

  const isLoading =
    permissionsState.isLoading ||
    (appStatus.isLoading && !appStatus.hasLoadedOnce);
  const hasLoadedOnce =
    permissionsState.hasLoadedOnce && appStatus.hasLoadedOnce;

  return (
    <IntegrationContext.Provider
      value={{
        isServiceM8Connected: appStatus.servicem8,
        isCommusoftConnected: appStatus.commusoft,
        isLeadsHubConnected: appStatus.leadshub,
        isSimProConnected: appStatus.simpro,
        userRole: permissionsState.userRole,
        pagePermissions: permissionsState.pagePermissions,
        isLoading,
        hasLoadedOnce,
        connectedServices,
        refreshStatus: fetchStatus,
      }}
    >
      {children}
    </IntegrationContext.Provider>
  );
}

export function useIntegrationContext() {
  const context = useContext(IntegrationContext);
  if (context === undefined) {
    throw new Error("useIntegrationContext must be used within an IntegrationProvider");
  }
  return context;
}
