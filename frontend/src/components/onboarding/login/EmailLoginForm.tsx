"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { API_ROUTES } from "@/src/constants/api.constants";
import { persistLoginResponse } from "@/src/services/auth.service";
import { GoogleAuthButton } from "../shared/GoogleAuthButton";

export function EmailLoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
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
      }, {
        withCredentials: true,
      });

      if (!loginRes?.success) {
        throw new Error(loginRes?.message || "Login failed");
      }

      persistLoginResponse(loginRes.data);

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
    <div className="w-full">

      {/* ── Heading ── */}
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue</p>
      </div>

      {/* ── Login form ── */}
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
            onChange={(e) => setEmail(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
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

      {/* ── Divider ── */}
      <div className="mt-7 flex items-center gap-3">
        <div className="flex-1 h-px bg-border/60" />
        <span className="text-xs text-muted-foreground font-medium">or</span>
        <div className="flex-1 h-px bg-border/60" />
      </div>

      {/* ── First-time setup card — always visible ── */}
      <GoogleAuthButton className="mt-5" />

      <Link
        href="/setup"
        className="mt-5 flex items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-4 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm group"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/15 transition-colors">
          <ShieldCheck className="h-4.5 w-4.5 text-primary" style={{ height: "1.125rem", width: "1.125rem" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Create admin account</p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            First time here? Set up your admin account to get started
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
