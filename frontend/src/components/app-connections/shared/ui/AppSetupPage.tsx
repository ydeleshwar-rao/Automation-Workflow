"use client";

/**
 * AppSetupPage
 * ─────────────────────────────────────────────────────────────
 * Reusable connect/data page for every integration.
 *
 * - NOT connected → shows branded connect card
 * - Connected     → shows data view + header with Disconnect button
 *
 * All connect/disconnect logic is handled here so individual
 * app pages stay as thin wrappers.
 */

import { useState, useEffect, useCallback } from "react";
import { Loader2, Unplug, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector, useAppDispatch } from "@/src/store/hooks";
import {
  selectConnectedServices,
  selectServiceM8NeedsReauth,
  selectAppStatusLoading,
  fetchAppStatus,
} from "@/src/store/appStatusSlice";
import { Button } from "@/src/components/ui/button";
import { CredentialsInlinePanel } from "./credentials-inline-panel";
import { commusoftApi }  from "@/src/components/app-connections/commusoft/api/commusoft.api";
import { servicem8Api }  from "@/src/components/app-connections/servicem8/api/servicem8.api";
import { leadshubApi }   from "@/src/components/app-connections/leadshubs/api/leadshub.api";
import { openAuthPopup, openSimproOAuthPopup } from "@/src/lib/open-auth-popup";
import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";
import type { AppDef } from "../types/app-def.types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppSetupPageProps {
  /** The full app definition from applications.config */
  app: AppDef;
  /** The data component to show when connected */
  DataView: React.ComponentType;
}

// ── Connect card (not connected) ──────────────────────────────────────────────

function ConnectCard({
  app,
  onConnect,
  isConnecting,
  needsReauth,
}: {
  app:          AppDef;
  onConnect:    () => void;
  isConnecting: boolean;
  needsReauth:  boolean;
}) {
  const [showCredentials, setShowCredentials] = useState(false);
  const dispatch = useAppDispatch();

  const handleSuccess = useCallback(() => {
    setShowCredentials(false);
    void dispatch(fetchAppStatus());
    toast.success(`Connected to ${app.name}!`);
  }, [app.name, dispatch]);

  return (
    <div className="flex flex-1 items-center justify-center p-6 min-h-[60vh]">
      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* App icon + name */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-xl"
            style={{ background: app.accentColor + "18", border: `2px solid ${app.accentColor}30` }}
          >
            {app.image ? (
              <img src={app.image} alt={app.name} className="h-12 w-12 object-contain" />
            ) : (
              <app.icon className="h-10 w-10" style={{ color: app.accentColor }} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{app.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground uppercase tracking-widest font-medium">
              {app.category}
            </p>
          </div>
        </div>

        {/* Description */}
        {app.description && (
          <p className="text-center text-sm text-muted-foreground leading-relaxed">
            {app.description}
          </p>
        )}

        {/* Scopes */}
        {app.scopes && (
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-1.5">
              What gets synced
            </p>
            <p className="text-sm text-foreground">{app.scopes}</p>
          </div>
        )}

        {/* Reauth warning */}
        {needsReauth && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Your connection expired — please reconnect.
            </p>
          </div>
        )}

        {/* Connect button or credentials form */}
        {app.connectType === "credentials" ? (
          showCredentials ? (
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <CredentialsInlinePanel
                app={app}
                onSuccess={handleSuccess}
                onCancel={() => setShowCredentials(false)}
              />
            </div>
          ) : (
            <Button
              className="w-full h-12 text-sm font-bold rounded-xl gap-2"
              style={{ background: app.accentColor }}
              onClick={() => setShowCredentials(true)}
            >
              Connect {app.name}
            </Button>
          )
        ) : (
          <Button
            className="w-full h-12 text-sm font-bold rounded-xl gap-2"
            style={{ background: app.accentColor }}
            onClick={onConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting…
              </>
            ) : needsReauth ? (
              "Reconnect"
            ) : (
              `Connect ${app.name}`
            )}
          </Button>
        )}

      </div>
    </div>
  );
}

// ── Connected header ──────────────────────────────────────────────────────────

function ConnectedHeader({
  app,
  onDisconnect,
  isDisconnecting,
}: {
  app:            AppDef;
  onDisconnect:   () => void;
  isDisconnecting: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-background">
      <div className="flex items-center gap-3">
        {app.image ? (
          <img src={app.image} alt={app.name} className="h-7 w-7 object-contain" />
        ) : (
          <app.icon className="h-6 w-6" style={{ color: app.accentColor }} />
        )}
        <div>
          <h1 className="text-base font-semibold text-foreground leading-tight">{app.name}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Connected</span>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onDisconnect}
        disabled={isDisconnecting}
        className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/60"
      >
        {isDisconnecting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Unplug className="h-3.5 w-3.5" />
        )}
        {isDisconnecting ? "Disconnecting…" : "Disconnect"}
      </Button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AppSetupPage({ app, DataView }: AppSetupPageProps) {
  const dispatch         = useAppDispatch();
  const queryClient      = useQueryClient();
  const connectedServices = useAppSelector(selectConnectedServices);
  const needsReauth       = useAppSelector(selectServiceM8NeedsReauth) && app.id === "servicem8";
  const isLoading         = useAppSelector(selectAppStatusLoading);

  const isConnected = connectedServices.includes(app.id) && !needsReauth;

  const [isConnecting,    setIsConnecting]    = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Fetch status on mount
  useEffect(() => {
    void dispatch(fetchAppStatus());
  }, [dispatch]);

  // Listen for OAuth popup results
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const successTypes: Record<string, boolean> = {
        GHL_CONNECT_SUCCESS:       true,
        SERVICEM8_CONNECT_SUCCESS: true,
        SIMPRO_CONNECT_SUCCESS:    true,
        OAUTH_SUCCESS:             true,
      };

      if (successTypes[event.data?.type]) {
        setIsConnecting(false);
        void dispatch(fetchAppStatus());
        queryClient.invalidateQueries({ queryKey: ["integration-status"] });
        toast.success(`Connected to ${app.name}!`);
      }
      if (event.data?.type === "GHL_CONNECT_ERROR") {
        setIsConnecting(false);
        toast.error(event.data.message ?? "Connection failed");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [app.name, dispatch, queryClient]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (app.id === "leadshub") {
        const popup = openAuthPopup("LeadsHub");
        const returnUrl = window.location.origin + "/dashboard/connections/ghl-callback";
        const result = await leadshubApi.connect(returnUrl);
        const authUrl = result?.data?.url ?? result?.data?.data?.url ?? result?.url;
        if (authUrl && popup) {
          popup.location.href = authUrl;
          window.addEventListener("focus", () => {
            void dispatch(fetchAppStatus());
            queryClient.invalidateQueries({ queryKey: ["integration-status"] });
          }, { once: true });
        } else {
          popup?.close();
          toast.error(result.message || "Failed to start connection");
          setIsConnecting(false);
        }
        return;
      }

      if (app.id === "servicem8") {
        const popup = openAuthPopup("ServiceM8");
        const returnUrl = window.location.origin + "/dashboard/servicem8";
        const result = await servicem8Api.connect(returnUrl);
        const authUrl = result?.data?.url ?? result?.data?.data?.url ?? result?.url;
        if (authUrl && popup) {
          popup.location.href = authUrl;
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              void dispatch(fetchAppStatus());
              queryClient.invalidateQueries({ queryKey: ["integration-status"] });
              setIsConnecting(false);
            }
          }, 1000);
        } else {
          popup?.close();
          toast.error(result.message || "Failed to start connection");
          setIsConnecting(false);
        }
        return;
      }

      if (app.id === "simpro" && app.href) {
        openSimproOAuthPopup(app.href);
        setIsConnecting(false);
        return;
      }

      setIsConnecting(false);
    } catch (err) {
      setIsConnecting(false);
      toast.error(err instanceof Error ? err.message : "Connection failed");
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      if (app.id === "servicem8") await servicem8Api.disconnect();
      else if (app.id === "commusoft") await commusoftApi.disconnect();
      else if (app.id === "leadshub") await leadshubApi.disconnect();
      else if (app.id === "simpro") {
        await axiosInstance.post(API_ROUTES.SIMPRO.DISCONNECT, {});
      }

      toast.success(`Disconnected from ${app.name}`);
      void dispatch(fetchAppStatus());
      queryClient.invalidateQueries({ queryKey: ["integration-status"] });
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Status loading skeleton
  if (isLoading && !connectedServices.length) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Not connected ──────────────────────────────────────────
  if (!isConnected) {
    return (
      <ConnectCard
        app={app}
        onConnect={() => void handleConnect()}
        isConnecting={isConnecting}
        needsReauth={needsReauth}
      />
    );
  }

  // ── Connected ──────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 h-full">
      <ConnectedHeader
        app={app}
        onDisconnect={() => void handleDisconnect()}
        isDisconnecting={isDisconnecting}
      />
      <div className="flex-1 overflow-hidden">
        <DataView />
      </div>
    </div>
  );
}
