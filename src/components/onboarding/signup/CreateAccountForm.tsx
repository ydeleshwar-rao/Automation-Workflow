"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, CheckCircle2, User, Mail, Lock } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { API_ROUTES } from "@/src/constants/api.constants";

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(p: string): { score: number; label: string; color: string } {
  if (!p) return { score: 0, label: "", color: "" };
  let score = 0;
  if (p.length >= 8)            score++;
  if (p.length >= 12)           score++;
  if (/[A-Z]/.test(p))         score++;
  if (/[0-9]/.test(p))         score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;

  if (score <= 1) return { score,  label: "Weak",   color: "bg-red-500"    };
  if (score <= 2) return { score,  label: "Fair",   color: "bg-amber-400"  };
  if (score <= 3) return { score,  label: "Good",   color: "bg-yellow-400" };
  if (score <= 4) return { score,  label: "Strong", color: "bg-emerald-400" };
  return           { score,        label: "Very strong", color: "bg-emerald-500" };
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ email }: { email: string }) {
  return (
    <div className="w-full flex flex-col items-center text-center gap-6 py-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Account created!</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your account for{" "}
          <span className="font-semibold text-foreground">{email}</span>{" "}
          is ready. You can sign in now.
        </p>
      </div>
      <Link
        href="/login"
        className="w-full bg-primary text-primary-foreground font-semibold rounded-xl px-5 py-3 text-sm hover:bg-primary/90 active:scale-[0.98] transition-all text-center"
      >
        Sign in to your account
      </Link>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export function CreateAccountForm() {
  const [fullName, setFullName]         = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [confirmPassword, setConfirm]   = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [success, setSuccess]           = useState(false);

  const strength = getStrength(password);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    // Client-side validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(API_ROUTES.AUTH.REGISTER, {
        email:     email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
      });

      if (!data?.success) {
        throw new Error(data?.message || "Registration failed");
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? err.message
        : err instanceof Error
        ? err.message
        : "An error occurred";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) return <SuccessScreen email={email} />;

  return (
    <div className="w-full">
      {/* Heading */}
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Create an account</h2>
        <p className="mt-1 text-sm text-muted-foreground">Fill in the details below to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">

        {/* Full name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Full name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="fullName"
              type="text"
              placeholder="Jane Smith"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-background border border-border/70 rounded-xl pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-border/70 rounded-xl pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border/70 rounded-xl pl-10 pr-11 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password strength bar */}
          {password && (
            <div className="space-y-1.5 mt-0.5 animate-in fade-in duration-200">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      n <= strength.score ? strength.color : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <p className={`text-[11px] font-medium ${
                strength.score <= 1 ? "text-red-500"
                : strength.score <= 2 ? "text-amber-500"
                : strength.score <= 3 ? "text-yellow-600"
                : "text-emerald-500"
              }`}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Confirm password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirm(e.target.value)}
              className={`w-full bg-background border rounded-xl pl-10 pr-11 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 transition-all ${
                confirmPassword && confirmPassword !== password
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                  : "border-border/70 focus:border-primary focus:ring-primary/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword && confirmPassword !== password && (
            <p className="text-[11px] text-red-500 font-medium animate-in fade-in duration-150">
              Passwords do not match
            </p>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-destructive text-xs font-medium">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-1 w-full bg-primary text-primary-foreground font-semibold rounded-xl px-5 py-3 text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      {/* Sign-in link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
