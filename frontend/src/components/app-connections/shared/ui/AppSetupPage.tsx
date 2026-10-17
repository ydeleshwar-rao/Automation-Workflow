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

import { useState, useCallback } from "react";
import { Loader2, Unplug, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch } from "@/src/store/hooks";
import { Button } from "@/src/components/ui/button";
import { CredentialsInlinePanel } from "./credentials-inline-panel";
import { openSimproOAuthPopup } from "@/src/lib/open-auth-popup";
import {
  INTEGRATION_STATUS_TAG,
  integrationsApi,
  isIntegrationAppId,
  useDisconnectIntegrationMutation,
  useGetIntegrationStatusesQuery,
} from "@/src/components/app-connections/apiIntegrations/integrationsApi";
import { useOAuthConnect } from "@/src/components/app-connections/hooks/useOAuthConnect";
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
    // The credentials panel connects outside RTK Query, so the cached statuses are refreshed here.
    dispatch(integrationsApi.util.invalidateTags([INTEGRATION_STATUS_TAG]));
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
  const { data: integrationStatuses, isLoading } = useGetIntegrationStatusesQuery();
  const [disconnectIntegration, { isLoading: isDisconnecting }] = useDisconnectIntegrationMutation();
  const { startConnect, isConnecting } = useOAuthConnect(app.id, app.name);

  const appStatus   = isIntegrationAppId(app.id) ? integrationStatuses?.[app.id] : undefined;
  const needsReauth = appStatus?.needsReauth ?? false;
  const isConnected = appStatus?.isConnected ?? false;

  const handleConnect = () => {
    if (app.id === "simpro" && app.href) {
      openSimproOAuthPopup(app.href);
      return;
    }
    void startConnect();
  };

  const handleDisconnect = async () => {
    if (!isIntegrationAppId(app.id)) return;
    try {
      await disconnectIntegration(app.id).unwrap();
      toast.success(`Disconnected from ${app.name}`);
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  // Status loading skeleton
  if (isLoading) {
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
        onConnect={handleConnect}
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
