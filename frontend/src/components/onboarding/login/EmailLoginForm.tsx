"use client";

import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import Link from "next/link";
import { persistLoginResponse } from "@/src/services/auth.service";
import { useLoginMutation } from "@/src/components/auth/apiIntegrations/authApi";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { SsoButtons } from "../shared/SsoButtons";
import { CompanySsoForm } from "./CompanySsoForm";

export function EmailLoginForm() {
  const [mode, setMode]         = useState<"options" | "company">("options");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  // Local flag (not the mutation's) so the button stays busy while the dashboard loads
  const [isLoading, setIsLoading] = useState(false);
  const [login] = useLoginMutation();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const loginResponse = await login({ email, password }).unwrap();
      if (!loginResponse.success) throw new Error(loginResponse.message || "Login failed");

      persistLoginResponse(loginResponse.data);
      window.location.assign("/dashboard");
    } catch (loginError: unknown) {
      setError(getApiErrorMessage(loginError, "An error occurred"));
      setIsLoading(false);
    }
  };

  if (mode === "company") return <CompanySsoForm onBack={() => setMode("options")} />;

  return (
    <div className="w-full">

      {/* ── Heading ── */}
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue</p>
      </div>

      {/* ── Google / Microsoft / company SSO ── */}
      <SsoButtons />

      <button
        type="button"
        onClick={() => setMode("company")}
        className="mt-3 w-full rounded-xl border border-border/70 bg-background px-5 py-3 text-sm font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] flex items-center justify-center gap-3"
      >
        <Building2 className="h-4 w-4 text-primary" />
        Sign in with company SSO
      </button>

      {/* ── Divider ── */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-border/60" />
        <span className="text-xs text-muted-foreground font-medium">or sign in with email</span>
        <div className="flex-1 h-px bg-border/60" />
      </div>

      {/* ── Email + password ── */}
      <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full bg-background border border-border/70 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full bg-background border border-border/70 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-destructive text-xs font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-1 w-full bg-primary text-primary-foreground font-semibold rounded-xl px-5 py-3 text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* ── New here ── */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-semibold text-primary hover:text-primary/80">
          Sign up
        </Link>
      </p>

      <Link
        href="/sign-up?type=company"
        className="mt-5 flex items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-4 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm group"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/15 transition-colors">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Set up your company</p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            Create a company workspace your team signs in to with Google Workspace or Microsoft 365
          </p>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Link>

    </div>
  );
}
