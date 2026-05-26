"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SearchInput } from "@/src/components/ui/search-input";
import { Button } from "@/src/components/ui/button";
import { API_ROUTES } from "@/src/constants/api.constants";
import { UI_MESSAGES } from "@/src/constants/ui.constants";
import { commusoftApi } from "@/src/components/app-connections/commusoft/api/commusoft.api";
import { servicem8Api } from "@/src/components/app-connections/servicem8/api/servicem8.api";
import { leadshubApi } from "@/src/components/app-connections/leadshubs/api/leadshub.api";
import { applications } from "@/src/components/app-connections/shared";
import type { AppDef } from "@/src/components/app-connections/shared/types/app-def.types";
import { IntegrationCard } from "@/src/components/app-connections/shared/ui/integration-card";
import { useIntegrationContext } from "@/src/components/app-connections/context/IntegrationContext";
import { useAppSelector } from "@/src/store/hooks";
import {
  selectAppStatusLoading,
  selectConnectedServices,
  selectServiceM8NeedsReauth,
} from "@/src/store/appStatusSlice";
import axiosInstance from "@/src/services/apiClient";
import { getActiveClientKey } from "@/src/store/localStorage";
import { toast } from "sonner";
import { openAuthPopup, openSimproOAuthPopup } from "@/src/lib/open-auth-popup";

type PendingAction = {
  appId: string;
  action: "connect" | "disconnect";
} | null;

function IntegrationsContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const queryClient = useQueryClient();
  // `refreshStatus` still comes from the context (it also refreshes role/permissions),
  // but the connection state is read straight from the Redux slice so this page
  // re-renders the moment the slice updates — no Context object churn.
  const { refreshStatus: fetchStatus } = useIntegrationContext();
  const connectedServices = useAppSelector(selectConnectedServices);
  const servicem8NeedsReauth = useAppSelector(selectServiceM8NeedsReauth);
  const isLoading = useAppSelector(selectAppStatusLoading);

  // Fetch integration status on mount so sidebar reflects connected apps
  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const setNotification = ({
    type,
    message,
  }: {
    type: "success" | "error";
    message: string;
  }) => {
    if (type === "success") {
      toast.success(message);
      return;
    }
    toast.error(message);
  };

  const isLockedInCategory = (appId: string, category: string) => {
    const categoryApps = applications.filter((a) => a.category === category);
    return categoryApps.some(
      (a) => a.id !== appId && connectedServices.includes(a.id),
    );
  };

  const getConnectedAppInCategory = (category: string) => {
    const categoryApps = applications.filter((a) => a.category === category);
    const connectedApp = categoryApps.find((a) =>
      connectedServices.includes(a.id),
    );
    return connectedApp?.name || "the connected app";
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for error messages in the URL
    const errorParam = searchParams.get("error");
    if (errorParam) {
      toast.error(decodeURIComponent(errorParam));
      const newUrl = window.location.pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GHL_CONNECT_ERROR") {
        toast.error(
          typeof event.data.message === "string"
            ? event.data.message
            : "LeadsHub connection failed",
        );
        setExpandedId(null);
        void fetchStatus();
        queryClient.invalidateQueries({ queryKey: ["integration-status"] });
        return;
      }

      const successMap: Record<string, string> = {
        GHL_CONNECT_SUCCESS: UI_MESSAGES.CONNECT_SUCCESS_GHL,
        SERVICEM8_CONNECT_SUCCESS: UI_MESSAGES.CONNECT_SUCCESS_SERVICEM8,
        SIMPRO_CONNECT_SUCCESS: "simPRO connected successfully!",
      };
      if (successMap[event.data?.type]) {
        toast.success(successMap[event.data.type]);
        setExpandedId(null);
        void fetchStatus();
        queryClient.invalidateQueries({ queryKey: ["integration-status"] });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [searchParams, queryClient, fetchStatus]);

  const handleDisconnect = async (appId: string) => {
    if (!confirm(`Are you sure you want to disconnect ${appId}?`)) return;
    setPendingAction({ appId, action: "disconnect" });
    const appName = applications.find((a) => a.id === appId)?.name ?? appId;
    try {
      const endpointMap: Record<string, string> = {
        leadshub: API_ROUTES.GHL.DISCONNECT,
        simpro: API_ROUTES.SIMPRO.DISCONNECT,
      };
      if (appId === "servicem8") {
        await servicem8Api.disconnect();
        toast.success(`Disconnected from ${appName}`);
        queryClient.invalidateQueries({ queryKey: ["integration-status"] });
        void fetchStatus();
        setExpandedId(null);
        return;
      }
      if (appId === "commusoft") {
        await commusoftApi.disconnect();
        toast.success(`Disconnected from ${appName}`);
        queryClient.invalidateQueries({ queryKey: ["integration-status"] });
        void fetchStatus();
        setExpandedId(null);
        return;
      }
      if (appId === "leadshub") {
        await leadshubApi.disconnect();
        setNotification({
          type: "success",
          message: UI_MESSAGES.DISCONNECT_SUCCESS(appId),
        });
        queryClient.invalidateQueries({ queryKey: ["integration-status"] });
        void fetchStatus();
        setExpandedId(null);
        return;
      }

      const endpoint = endpointMap[appId];
      if (!endpoint) return;
      const clientKey = getActiveClientKey();
      await axiosInstance.post(endpoint, {}, { headers: { clientkey: clientKey } });
      toast.success(`Disconnected from ${appName}`);
      queryClient.invalidateQueries({ queryKey: ["integration-status"] });
      void fetchStatus();
      setExpandedId(null);
    } catch {
      toast.error("An error occurred during disconnection.");
    } finally {
      setPendingAction((prev) =>
        prev?.appId === appId && prev.action === "disconnect" ? null : prev,
      );
    }
  };



  const handleOAuthConnect = async (app: AppDef) => {
    if (!app.href) return;
    setPendingAction({ appId: app.id, action: "connect" });
    const appName = app.name;

    if (app.id === "leadshub") {
      const popup = openAuthPopup("LeadsHub");
      try {
        const returnUrl =
          window.location.origin + "/dashboard/connections/ghl-callback";
        const result = await leadshubApi.connect(returnUrl);

        if (
          result.message?.toLowerCase().includes("already connected") ||
          result.data?.alreadyConnected
        ) {
          if (popup) popup.close();
          void fetchStatus();
          return;
        }

        const authUrl = result?.data?.url || result?.data?.data?.url || result?.url;

        if (authUrl && popup) {
          popup.location.href = authUrl;
          const handleWindowFocus = () => {
            void fetchStatus();
            queryClient.invalidateQueries({
              queryKey: ["integration-status"],
            });
          };
          window.addEventListener("focus", handleWindowFocus, { once: true });
        } else {
          if (popup) popup.close();
          setNotification({
            type: "error",
            message: result.message || "Failed to start LeadsHub connection",
          });
        }
      } catch (err) {
        if (popup) popup.close();
        setNotification({
          type: "error",
          message:
            err instanceof Error ? err.message : "Failed to connect LeadsHub",
        });
      }
      return;
    }

    if (app.id === "servicem8") {
      const popup = openAuthPopup("ServiceM8");

      try {
        const returnUrl = window.location.origin + "/dashboard/connections";
        const result = await servicem8Api.connect(returnUrl);

        if (result.message?.toLowerCase().includes("already connected") || result.data?.alreadyConnected) {
          if (popup) popup.close();
          void fetchStatus();
          return;
        }

        const authUrl = result?.data?.url || result?.data?.data?.url || result?.url;
        if (!authUrl) {
          if (popup) popup.close();
          toast.error(result.message || "Failed to start ServiceM8 connection");
          return;
        }

        if (popup) {
          popup.location.href = authUrl;
        } else {
          toast.error("Popup blocked. Please allow popups and try again.");
          return;
        }

        let hasShownSuccessToast = false;
        const showConnectedToast = () => {
          if (hasShownSuccessToast) return;
          hasShownSuccessToast = true;
          toast.success(`Successfully connected to ${appName}!`);
        };

        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type === "OAUTH_SUCCESS" || event.data?.type === "SERVICEM8_CONNECT_SUCCESS") {
            window.removeEventListener("message", handleMessage);
            clearInterval(checkClosed);
            popup.close();
            void fetchStatus();
            queryClient.invalidateQueries({ queryKey: ["integration-status"] });
            showConnectedToast();
          }
        };

        window.addEventListener("message", handleMessage);

        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener("message", handleMessage);
            void fetchStatus();
            queryClient.invalidateQueries({ queryKey: ["integration-status"] });
            showConnectedToast();
          }
        }, 1000);

        return;
      } catch (err) {
        if (popup) popup.close();
        toast.error(
          err instanceof Error ? err.message : "An error occurred while connecting ServiceM8",
        );
        return;
      }
    }

    if (app.id === "simpro") {
      openSimproOAuthPopup(app.href);
      return;
    }
    setPendingAction((prev) =>
      prev?.appId === app.id && prev.action === "connect" ? null : prev,
    );
    return;
  };

  const handleConnect = async (app: AppDef) => {
    try {
      await handleOAuthConnect(app);
    } finally {
      setPendingAction((prev) =>
        prev?.appId === app.id && prev.action === "connect" ? null : prev,
      );
    }
  };

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
      <div className="mr-[4px] w-[calc(100%_-_7px)] space-y-4 p-[4px] font-sans animate-in fade-in duration-500">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-background via-accent/20 to-background px-5 py-4 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-sans">Connections</h1>
            {isLoading && (
              <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Syncing status...
              </div>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">Connect your tools.</p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/90 p-3 shadow-[0_2px_14px_0_hsl(var(--foreground)/0.05)] sm:flex-row">
          <SearchInput
            placeholder="Search integrations..."
            className="h-11 rounded-xl border-border/70 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="default" className="h-11 rounded-xl px-6">All</Button>
        </div>

        {(() => {
          const categoryOrder = ["Lead Management", "Job Management"];
          const grouped = categoryOrder
            .map((cat) => ({
              category: cat,
              apps: filteredApps.filter((app) => app.category === cat),
            }))
            .filter((group) => group.apps.length > 0);

          return (
            <div className="flex flex-col gap-8">
              {grouped.map((group) => (
                <div key={group.category} className="space-y-4 rounded-2xl border border-border/60 bg-background/85 p-4 shadow-[0_2px_14px_0_hsl(var(--foreground)/0.05)]">
                  <div className="inline-flex rounded-lg border border-border bg-muted/40 px-3 py-1.5">
                    <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.category}
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3">
                    {group.apps.map((app) => {
                      const isConnected = connectedServices.includes(app.id);
                      const isLocked = isLockedInCategory(app.id, app.category);

                      return (
                        <IntegrationCard
                          key={app.id}
                          app={app}
                          isConnected={isConnected}
                          needsReauth={app.id === "servicem8" && servicem8NeedsReauth}
                          isExpanded={expandedId === app.id}
                          isLocked={isLocked}
                          onToggle={() => {
                            if (isLocked) {
                              const connectedName = getConnectedAppInCategory(app.category);
                              toast.error(
                                `Please disconnect ${connectedName} first before connecting ${app.name}.`,
                              );
                              return;
                            }
                            setExpandedId((prev) => (prev === app.id ? null : app.id));
                          }}
                          onConnect={() => handleConnect(app)}
                          onDisconnect={() => handleDisconnect(app.id)}
                          isConnecting={
                            pendingAction?.appId === app.id &&
                            pendingAction.action === "connect"
                          }
                          isDisconnecting={
                            pendingAction?.appId === app.id &&
                            pendingAction.action === "disconnect"
                          }
                          onLockedClick={() => {
                            const connectedName = getConnectedAppInCategory(app.category);
                            toast.error(
                              `Please disconnect ${connectedName} first before connecting ${app.name}.`,
                            );
                          }}
                          onSuccess={() => {
                            setExpandedId(null);
                            toast.success(`Connected to ${app.name}`);
                            void fetchStatus();
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
  );
}

export default function IntegrationsPage() {
  return <IntegrationsContent />;
}
