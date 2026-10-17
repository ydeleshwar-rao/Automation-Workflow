"use client";

/**
 * ConnectInlineSection
 * ─────────────────────────────────────────────────────────────
 * Shown inside workflow setup panels when the app is NOT connected.
 * Handles OAuth (popup) and Credentials-based connections inline.
 */

import { useState } from "react";
import { Loader2, Plug, Lock, User, Info } from "lucide-react";
import { toast }         from "sonner";
import { Button }        from "@/src/components/ui/button";
import { Input }         from "@/src/components/ui/input";
import { getApiErrorMessage } from "@/src/lib/api-error";
import {
  useConnectCommusoftMutation,
  type IntegrationAppId,
} from "@/src/components/app-connections/apiIntegrations/integrationsApi";
import { useOAuthConnect } from "@/src/components/app-connections/hooks/useOAuthConnect";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConnectInlineSectionProps {
  appId:     IntegrationAppId;
  appName:   string;
  accentColor?: string;
  appImage?: string;
}

const COMMUSOFT_BRAND_COLOR = "#f58320";
const DEFAULT_ACCENT_COLOR = "#6366f1";

// ── Commusoft credentials form ────────────────────────────────────────────────

/** Commusoft uses credentials, not OAuth; a successful connect refreshes the statuses itself. */
function CommusoftConnectForm() {
  const [connectCommusoft, { isLoading }] = useConnectCommusoftMutation();
  const [clientId,  setClientId]  = useState("");
  const [username,  setUsername]  = useState("");
  const [password,  setPassword]  = useState("");
  const [error,     setError]     = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clientId || !username || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    try {
      await connectCommusoft({ clientId, username, password }).unwrap();
      toast.success("Commusoft connected successfully!");
    } catch (connectError) {
      setError(getApiErrorMessage(connectError, "Failed to connect. Check your credentials."));
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
            onChange={(event) => setClientId(event.target.value)}
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
            onChange={(event) => setUsername(event.target.value)}
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
            onChange={(event) => setPassword(event.target.value)}
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
        style={{ background: COMMUSOFT_BRAND_COLOR }}
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
  accentColor = DEFAULT_ACCENT_COLOR,
  appImage,
}: ConnectInlineSectionProps) {
  const { startConnect, isConnecting } = useOAuthConnect(appId, appName);
  const [showForm, setShowForm] = useState(false);

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
          <CommusoftConnectForm />
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
          onClick={() => void startConnect()}
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
