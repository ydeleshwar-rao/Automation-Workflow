"use client";

/**
 * ConnectInlineSection
 * ─────────────────────────────────────────────────────────────
 * Shown inside workflow setup panels when the app is NOT connected.
 * Handles OAuth (popup) and Credentials-based connections inline.
 */

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plug, Lock, User, Info } from "lucide-react";
import { toast }         from "sonner";
import { Button }        from "@/src/components/ui/button";
import { Input }         from "@/src/components/ui/input";
import { useAppDispatch } from "@/src/store/hooks";
import { fetchAppStatus } from "@/src/store/appStatusSlice";
import { useQueryClient } from "@tanstack/react-query";
import { servicem8Api }  from "@/src/components/app-connections/servicem8/api/servicem8.api";
import { leadshubApi }   from "@/src/components/app-connections/leadshubs/api/leadshub.api";
import { commusoftApi }  from "@/src/components/app-connections/commusoft/api/commusoft.api";
import { openAuthPopup } from "@/src/lib/open-auth-popup";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppConnectId = "servicem8" | "commusoft" | "leadshub" | "simpro";

interface ConnectInlineSectionProps {
  appId:     AppConnectId;
  appName:   string;
  accentColor?: string;
  appImage?: string;
}

// ── Commusoft credentials form ────────────────────────────────────────────────

function CommusoftConnectForm({ onSuccess }: { onSuccess: () => void }) {
  const [clientId,  setClientId]  = useState("");
  const [username,  setUsername]  = useState("");
  const [password,  setPassword]  = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !username || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await commusoftApi.connect({ clientId, username, password });
      toast.success("Commusoft connected successfully!");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect. Check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-3">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-xs text-destructive">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="relative">
          <Info className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Client ID"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={isLoading}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="relative">
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      <Button
        type="submit"
        size="sm"
        disabled={isLoading}
        className="w-full h-9 gap-2 text-xs font-bold"
        style={{ background: "#f58320" }}
      >
        {isLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Connecting…</> : "Authorize Connection"}
      </Button>
    </form>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ConnectInlineSection({
  appId,
  appName,
  accentColor = "#6366f1",
  appImage,
}: ConnectInlineSectionProps) {
  const dispatch     = useAppDispatch();
  const queryClient  = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showForm,     setShowForm]     = useState(false);

  const refresh = useCallback(() => {
    void dispatch(fetchAppStatus());
    queryClient.invalidateQueries({ queryKey: ["integration-status"] });
  }, [dispatch, queryClient]);

  // Listen for OAuth popup success messages
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const successTypes = ["GHL_CONNECT_SUCCESS", "SERVICEM8_CONNECT_SUCCESS", "SIMPRO_CONNECT_SUCCESS", "OAUTH_SUCCESS"];
      if (successTypes.includes(event.data?.type)) {
        setIsConnecting(false);
        toast.success(`${appName} connected!`);
        refresh();
      }
      if (event.data?.type === "GHL_CONNECT_ERROR") {
        setIsConnecting(false);
        toast.error(event.data.message ?? "Connection failed");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [appName, refresh]);

  const handleOAuthConnect = async () => {
    setIsConnecting(true);
    try {
      if (appId === "servicem8") {
        const popup = openAuthPopup("ServiceM8");
        const returnUrl = window.location.origin + "/dashboard/servicem8";
        const result = await servicem8Api.connect(returnUrl);
        const authUrl = result?.data?.url ?? result?.data?.data?.url ?? result?.url;
        if (authUrl && popup) {
          popup.location.href = authUrl;
          const check = setInterval(() => {
            if (popup.closed) {
              clearInterval(check);
              setIsConnecting(false);
              refresh();
            }
          }, 1000);
        } else {
          popup?.close();
          setIsConnecting(false);
          toast.error(result?.message ?? "Failed to start connection");
        }
        return;
      }

      if (appId === "leadshub") {
        const popup = openAuthPopup("LeadsHub");
        const returnUrl = window.location.origin + "/dashboard/connections/ghl-callback";
        const result = await leadshubApi.connect(returnUrl);
        const authUrl = result?.data?.url ?? result?.data?.data?.url ?? result?.url;
        if (authUrl && popup) {
          popup.location.href = authUrl;
          window.addEventListener("focus", () => { setIsConnecting(false); refresh(); }, { once: true });
        } else {
          popup?.close();
          setIsConnecting(false);
          toast.error(result?.message ?? "Failed to start connection");
        }
        return;
      }

      setIsConnecting(false);
    } catch (err) {
      setIsConnecting(false);
      toast.error(err instanceof Error ? err.message : "Connection failed");
    }
  };

  return (
    <div
      className="rounded-xl border p-4 space-y-3 animate-in fade-in duration-300"
      style={{ borderColor: `${accentColor}30`, background: `${accentColor}08` }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
        >
          {appImage ? (
            <img src={appImage} alt={appName} className="h-5 w-5 object-contain" />
          ) : (
            <Plug className="h-4 w-4" style={{ color: accentColor }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{appName} not connected</p>
          <p className="text-xs text-muted-foreground">Connect your account to continue</p>
        </div>
      </div>

      {/* Commusoft: credentials form toggle */}
      {appId === "commusoft" ? (
        showForm ? (
          <CommusoftConnectForm onSuccess={refresh} />
        ) : (
          <Button
            size="sm"
            className="w-full h-9 gap-2 text-xs font-bold text-white"
            style={{ background: accentColor }}
            onClick={() => setShowForm(true)}
          >
            <Plug className="h-3.5 w-3.5" />
            Connect {appName}
          </Button>
        )
      ) : (
        /* OAuth apps */
        <Button
          size="sm"
          className="w-full h-9 gap-2 text-xs font-bold text-white"
          style={{ background: accentColor }}
          onClick={() => void handleOAuthConnect()}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Connecting…</>
          ) : (
            <><Plug className="h-3.5 w-3.5" />Connect {appName}</>
          )}
        </Button>
      )}
    </div>
  );
}
