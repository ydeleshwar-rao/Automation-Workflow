"use client";

import { Info, Loader2, Lock, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import type { AppDef } from "../types/app-def.types";
import { commusoftApi } from "@/src/components/app-connections/commusoft/api/commusoft.api";

type CredentialsInlinePanelProps = {
  app: AppDef;
  onSuccess: () => void;
  onCancel: () => void;
};

export function CredentialsInlinePanel({
  app,
  onSuccess,
  onCancel,
}: CredentialsInlinePanelProps) {
  const [clientId, setClientId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !username || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await commusoftApi.connect({ clientId, username, password });
      setSuccess(result.message || "Commusoft connected successfully.");
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to connect. Please check your credentials.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="border-t px-5 py-5 animate-in slide-in-from-top-2 duration-300"
      style={{ borderColor: `${app.accentColor}30`, background: `${app.accentColor}08` }}
    >
      <p
        className="text-[11px] font-bold uppercase tracking-widest mb-4"
        style={{ color: app.accentColor }}
      >
        Enter {app.name} Credentials
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[12px] font-medium flex items-start gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[12px] font-medium">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1 ml-0.5">
              Client ID
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="e.g. 20225"
                className="pl-8 h-9 text-sm rounded-lg bg-white dark:bg-card border-border/60"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={isLoading}
              />
              <Info className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1 ml-0.5">
              Username
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Your username"
                className="pl-8 h-9 text-sm rounded-lg bg-white dark:bg-card border-border/60"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1 ml-0.5">
              Password
            </label>
            <div className="relative">
              <Input
                type="password"
                placeholder="••••••••"
                className="pl-8 h-9 text-sm rounded-lg bg-white dark:bg-card border-border/60"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            size="sm"
            className="h-9 px-6 font-bold rounded-lg shadow-md text-[12px] uppercase tracking-wide text-white"
            style={{ background: app.accentColor }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Connecting...
              </>
            ) : (
              "Authorize Connection"
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 px-4 text-[12px] font-medium text-muted-foreground"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
