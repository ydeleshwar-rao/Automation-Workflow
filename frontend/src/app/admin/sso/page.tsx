"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Loader2, ShieldCheck, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";
import { Switch } from "@/src/components/ui/switch";
import { GoogleLogo, MicrosoftLogo } from "@/src/components/onboarding/shared/SsoButtons";
import {
  PROVIDER_LABEL,
  SSO_PROVIDERS,
  startSsoSignIn,
  type SsoProvider,
} from "@/src/lib/auth/provider";

type SsoSettings = {
  organization: { id: string; name: string; type: "individual" | "company"; ssoRequired: boolean };
  connections: { id: string; provider: SsoProvider; domain: string; tenantKey: string; createdAt: string }[];
  canRequireSso: boolean;
};

const LOGOS = { google: GoogleLogo, microsoft: MicrosoftLogo };

const errorMessage = (err: unknown) =>
  axios.isAxiosError(err) ? err.response?.data?.message ?? err.message : err instanceof Error ? err.message : "Something went wrong";

export default function CompanySsoPage() {
  const [settings, setSettings] = useState<SsoSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get(API_ROUTES.SSO.SETTINGS);
      setSettings(data.data);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
    if (new URLSearchParams(window.location.search).get("connected")) {
      toast.success("Company sign-in connected");
      window.history.replaceState(null, "", "/admin/sso");
    }
  }, [load]);

  const connect = async (provider: SsoProvider) => {
    setBusy(`connect-${provider}`);
    try {
      await startSsoSignIn(provider, { intent: "connect" });
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(null);
    }
  };

  const toggleRequired = async (required: boolean) => {
    setBusy("required");
    try {
      const { data } = await axiosInstance.patch(API_ROUTES.SSO.SETTINGS, { sso_required: required });
      setSettings(data.data);
      toast.success(required ? "Employees must now sign in with company SSO" : "Password sign-in allowed again");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string, label: string) => {
    if (!window.confirm(`Disconnect ${label}? Employees from it won't be able to join automatically any more.`)) return;
    setBusy(`remove-${id}`);
    try {
      const { data } = await axiosInstance.delete(API_ROUTES.SSO.CONNECTION(id));
      setSettings(data.data);
      toast.success("Disconnected");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const connectedProviders = new Set(settings?.connections.map((connection) => connection.provider));
  const available = SSO_PROVIDERS.filter((provider) => !connectedProviders.has(provider));

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin
      </Link>

      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Company SSO</h1>
        <p className="text-sm text-muted-foreground">
          Let employees sign in with their Google Workspace or Microsoft 365 account. Anyone from a connected
          company account joins this workspace automatically, with no page access until you grant it in Access Control.
        </p>
      </div>

      {loadError && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{loadError}</div>}

      {!settings && !loadError && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      )}

      {settings && (
        <>
          {/* Workspace */}
          <section className="rounded-2xl border border-border/60 bg-background p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted border border-border/60">
              {settings.organization.type === "company"
                ? <Building2 className="h-5 w-5 text-primary" />
                : <User className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{settings.organization.name}</p>
              <p className="text-xs text-muted-foreground">
                {settings.organization.type === "company"
                  ? "Company workspace"
                  : "Personal workspace — connecting a company account turns it into a company workspace"}
              </p>
            </div>
          </section>

          {/* Connections */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold">Connected sign-in</h2>

            {settings.connections.length === 0 && (
              <p className="text-sm text-muted-foreground">No company account connected yet.</p>
            )}

            {settings.connections.map((connection) => {
              const Logo = LOGOS[connection.provider];
              const label = `${PROVIDER_LABEL[connection.provider].company} (${connection.domain})`;
              return (
                <div key={connection.id} className="flex items-center gap-4 rounded-xl border border-border/60 bg-background px-4 py-3">
                  <Logo className="h-5 w-5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{PROVIDER_LABEL[connection.provider].company}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {connection.provider === "google" ? `Domain ${connection.domain}` : `${connection.domain} · tenant ${connection.tenantKey}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(connection.id, label)}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    {busy === `remove-${connection.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Disconnect
                  </button>
                </div>
              );
            })}

            {available.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                {available.map((provider) => {
                  const Logo = LOGOS[provider];
                  return (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => connect(provider)}
                      disabled={busy !== null}
                      className="flex-1 rounded-xl border border-border/70 bg-background px-4 py-3 text-sm font-semibold transition-all hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60 flex items-center justify-center gap-2.5"
                    >
                      {busy === `connect-${provider}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Logo />}
                      Connect {PROVIDER_LABEL[provider].company}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              You&apos;ll sign in with a work account from your company; its
              domain (Google) or tenant (Microsoft) is linked to this workspace. Each company can be linked to only one workspace.
            </p>
          </section>

          {/* Require SSO */}
          <section className="rounded-2xl border border-border/60 bg-background p-5 space-y-3">
            <div className="flex items-start gap-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Require company SSO</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Members must sign in with Google Workspace / Microsoft 365. Password sign-in is blocked, and email
                  sign-ups from your domain are sent to company sign-in.
                </p>
              </div>
              <Switch
                checked={settings.organization.ssoRequired}
                disabled={busy !== null || settings.connections.length === 0 || (!settings.canRequireSso && !settings.organization.ssoRequired)}
                onCheckedChange={toggleRequired}
                aria-label="Require company SSO"
              />
            </div>
            {settings.connections.length > 0 && !settings.canRequireSso && !settings.organization.ssoRequired && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Sign in once with your own company account (Connect above, or log out and use “Continue with Google/Microsoft”)
                before turning this on, so you can&apos;t lock yourself out.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
