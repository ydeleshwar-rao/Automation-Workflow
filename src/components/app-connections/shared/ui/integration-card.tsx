"use client";

import { AlertCircle, CheckCircle2, ChevronDown, Loader2, Lock } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { MouseEvent } from "react";
import { CredentialsInlinePanel } from "./credentials-inline-panel";
import { OAuthInlinePanel } from "./oauth-inline-panel";
import type { AppDef } from "../types/app-def.types";

type IntegrationCardProps = {
  app: AppDef;
  isConnected: boolean;
  needsReauth?: boolean;
  isExpanded: boolean;
  isLocked: boolean;
  onToggle: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onSuccess: () => void;
  onLockedClick?: () => void;
  isConnecting?: boolean;
  isDisconnecting?: boolean;
};

export function IntegrationCard({
  app,
  isConnected,
  needsReauth = false,
  isExpanded,
  isLocked,
  onToggle,
  onConnect,
  onDisconnect,
  onSuccess,
  onLockedClick,
  isConnecting = false,
  isDisconnecting = false,
}: IntegrationCardProps) {
  const showPanel = isExpanded && !isConnected && !needsReauth && !isLocked;
  const isActionLoading = isConnecting || isDisconnecting;

  const handleDisconnectClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onDisconnect();
  };

  const handleConnectClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (app.connectType === "credentials") {
      onToggle();
      return;
    }
    onConnect();
  };

  return (
    <div
      className={cn(
        "group relative min-h-[80px] w-full bg-card rounded-xl overflow-hidden border shadow-sm transition-all duration-200",
        "border-border/50",
        !isLocked && "hover:shadow-md cursor-pointer",
        isLocked && "opacity-60 cursor-not-allowed",
      )}
      style={
        showPanel
          ? {
              outline: `2px solid ${app.accentColor}50`,
              boxShadow: `0 4px 20px ${app.accentColor}12`,
            }
          : {}
      }
    >
      <div
        className="flex items-center min-h-[80px]"
        onClick={() => {
          if (isActionLoading) return;
          if (isLocked) {
            onLockedClick?.();
            return;
          }
          if (!isConnected) onToggle();
        }}
      >
        {/* Left colored section */}
        <div
          className={cn(
            "m-0 w-[80px] min-h-[80px] shrink-0 self-stretch flex items-center justify-center",
            app.color,
          )}
          aria-hidden
        >
          <div className="w-12 h-12 rounded-lg bg-white shadow-xl border border-border/20 flex items-center justify-center relative">
            {app.image ? (
              <img
                src={app.image}
                className="w-full h-full object-contain p-1"
                alt={app.name}
              />
            ) : (
              <app.icon className="w-10 h-10 text-slate-800" />
            )}
            {isConnected && !needsReauth && (
              <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-md border border-border/50">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </div>
            )}
            {needsReauth && (
              <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-md border border-border/50">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 px-6 md:px-8">
          <div className="flex items-center justify-between gap-8">
            {/* App name and category */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                {app.name}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground uppercase tracking-wider truncate">
                {app.category}
              </p>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3 shrink-0">
              {isLocked ? (
                <div
                  onClick={onLockedClick}
                  className="flex items-center gap-2 mr-4 cursor-not-allowed"
                >
                  <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-medium text-muted-foreground tracking-wide">
                    LOCKED
                  </span>
                </div>
              ) : needsReauth ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    RECONNECT REQUIRED
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onConnect(); }}
                    disabled={isConnecting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isConnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isConnecting ? "CONNECTING..." : "RECONNECT"}
                  </button>
                </div>
              ) : isConnected ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    ACTIVE
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDisconnect();
                    }}
                    disabled={isDisconnecting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isDisconnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isDisconnecting ? "DISCONNECTING..." : "DISCONNECT"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border border-border text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
                    NOT CONNECTED
                  </span>
                  <button
                    type="button"
                    onClick={handleConnectClick}
                    disabled={isConnecting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isConnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isConnecting ? "CONNECTING..." : "CONNECT"}
                  </button>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={
                      isExpanded
                        ? "Collapse connection details"
                        : "Expand connection details"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle();
                    }}
                    disabled={isActionLoading}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPanel &&
        (app.connectType === "credentials" ? (
          <CredentialsInlinePanel
            app={app}
            onSuccess={onSuccess}
            onCancel={onToggle}
          />
        ) : (
          <OAuthInlinePanel app={app} onConnect={onConnect} onCancel={onToggle} />
        ))}
    </div>
  );
}

