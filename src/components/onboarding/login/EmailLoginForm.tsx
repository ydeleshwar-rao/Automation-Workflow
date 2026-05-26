"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { API_ROUTES } from "@/src/constants/api.constants";
import { saveSession, saveProfile } from "@/src/store/localStorage";
import { createClient } from "@/src/lib/supabase/client";

function getCookieMaxAgeSeconds(expiresAt: unknown): number {
  if (typeof expiresAt === "number") {
    const expiresUnix =
      expiresAt > 1_000_000_000_000 ? Math.floor(expiresAt / 1000) : expiresAt;
    return Math.max(0, Math.floor(expiresUnix - Date.now() / 1000));
  }
  if (typeof expiresAt === "string") {
    const parsed = Date.parse(expiresAt);
    if (!Number.isNaN(parsed)) {
      return Math.max(0, Math.floor(parsed / 1000 - Date.now() / 1000));
    }
  }
  return 24 * 60 * 60;
}

export function EmailLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data: loginRes } = await axios.post(API_ROUTES.AUTH.LOGIN, {
        email,
        password,
      });

      if (!loginRes?.success) {
        throw new Error(loginRes?.message || "Login failed");
      }

      const { user_id, email: userEmail, access_token, refresh_token, expires_at } =
        loginRes.data;

      const { data: profileRes } = await axios.get(API_ROUTES.AUTH.PROFILE, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!profileRes?.success) {
        throw new Error(profileRes?.message || "Failed to load profile");
      }

      const p = profileRes.data.profile;

      // Cookie first — the proxy (proxy.ts) gates /dashboard on this exact cookie,
      // so it has to exist before we navigate.
      if (typeof document !== "undefined") {
        const maxAge = getCookieMaxAgeSeconds(expires_at);
        document.cookie = `jm_access_token=${encodeURIComponent(
          access_token
        )}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
      }

      saveSession({
        userId: user_id,
        email: userEmail,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expires_at,
      });

      saveProfile({
        userId: p.id,
        clientKey: p.clientkey ?? "",
        email: p.email,
        firstName: p.first_name,
        lastName: p.last_name,
        role: p.role,
        phone: p.phone,
        companyName: p.company_name,
        avatarUrl: p.avatar_url,
        websiteUrl: p.website_url,
        jobAppType: p.job_app_type,
      });

      // Supabase browser session — needed by components that call supabase.auth.getUser()
      // on the dashboard. Await so the session is persisted before we navigate.
      const supabase = createClient();
      await supabase.auth.setSession({ access_token, refresh_token });

      // Full-page navigation guarantees:
      //  - the proxy re-reads the jm_access_token cookie we just set
      //  - Redux store, IntegrationProvider, and AccessBootstrap all mount fresh
      //  - no race with router.refresh() swallowing router.push() (root cause of the
      //    "need 3 clicks to log in" bug — the soft-nav push was being cancelled by
      //    the refresh of the current /login route).
      // AccessBootstrap on /dashboard will call bootstrapAccess() itself on mount,
      // so we don't dispatch it here.
      window.location.assign("/dashboard");
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? err.message
          : err instanceof Error
          ? err.message
          : "An error occurred";
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-3 w-full">
      <input
        type="email"
        placeholder="Email address"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full bg-background/5 border border-border/70 rounded-full px-5 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary transition-colors"
      />
      <input
        type="password"
        placeholder="Password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-background/5 border border-border/70 rounded-full px-5 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary transition-colors"
      />
      {error && (
        <p className="text-destructive text-xs px-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground font-semibold rounded-full px-5 py-3 text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </button>

      {isLoading && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </form>
  );
}
