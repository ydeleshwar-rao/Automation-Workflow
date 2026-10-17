"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, CheckCircle2, User, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { useRegisterMutation } from "@/src/components/auth/apiIntegrations/authApi";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { SsoButtons } from "../shared/SsoButtons";
import { PasswordStrengthMeter } from "../shared/PasswordStrengthMeter";
import { MIN_PASSWORD_LENGTH, validateNewPassword } from "../shared/password.utils";

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
  const [success, setSuccess]           = useState(false);
  const [registerAccount, { isLoading }] = useRegisterMutation();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    const validationError = validateNewPassword(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    try {
      const registerResponse = await registerAccount({
        email:     email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
      }).unwrap();
      if (!registerResponse.success) throw new Error(registerResponse.message || "Registration failed");

      setSuccess(true);
    } catch (registerError: unknown) {
      setError(getApiErrorMessage(registerError, "An error occurred"));
    }
  };

  if (success) return <SuccessScreen email={email} />;

  return (
    <div className="w-full">
      {/* Heading */}
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Create your account</h2>
        <p className="mt-1 text-sm text-muted-foreground">A personal workspace, just for you</p>
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
              onChange={(event) => setFullName(event.target.value)}
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
              onChange={(event) => setEmail(event.target.value)}
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
              placeholder={`Min. ${MIN_PASSWORD_LENGTH} characters`}
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-background border border-border/70 rounded-xl pl-10 pr-11 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <PasswordStrengthMeter password={password} />
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
              onChange={(event) => setConfirm(event.target.value)}
              className={`w-full bg-background border rounded-xl pl-10 pr-11 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 transition-all ${
                confirmPassword && confirmPassword !== password
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                  : "border-border/70 focus:border-primary focus:ring-primary/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
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

      <div className="mt-7 flex items-center gap-3">
        <div className="flex-1 h-px bg-border/60" />
        <span className="text-xs text-muted-foreground font-medium">or</span>
        <div className="flex-1 h-px bg-border/60" />
      </div>

      <SsoButtons className="mt-5" />

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
