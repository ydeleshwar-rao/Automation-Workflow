"use client";

import { useState } from "react";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  discoverCompanySso,
  startSsoSignIn,
  PROVIDER_LABEL,
  type SsoDiscovery,
} from "@/src/lib/auth/provider";
import { SsoProviderButton } from "../shared/SsoButtons";

/** "Sign in with company SSO": work email → the company's Google Workspace / Microsoft 365. */
export function CompanySsoForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<SsoDiscovery | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setFound(null);

    try {
      const result = await discoverCompanySso(email.trim());
      if (result.providers.length === 0) {
        setError(`No company sign-in is set up for ${result.domain || "this email"}. ` +
          "Use Google, Microsoft or your password — or ask your admin to set up company SSO.");
        setIsLoading(false);
        return;
      }
      if (result.providers.length === 1) {
        const provider = result.providers[0]!;
        await startSsoSignIn(provider, {
          loginHint: email.trim(),
          domainHint: provider === "google" ? result.domain : undefined,
        });
        return;
      }
      setFound(result);
      setIsLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not look up company sign-in");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All sign-in options
      </button>

      <div className="mb-7">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Company sign-in</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your work email and we&apos;ll send you to your company&apos;s Google Workspace or Microsoft 365.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sso-email" className="text-sm font-medium text-foreground">Work email</label>
          <input
            id="sso-email"
            type="email"
            placeholder="you@yourcompany.com"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-background border border-border/70 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <p className="text-destructive text-xs font-medium">{error}</p>
          </div>
        )}

        {!found && (
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl px-5 py-3 text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Finding your company…</> : "Continue"}
          </button>
        )}
      </form>

      {found && (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{found.organizationName}</span> signs in with:
          </p>
          {found.providers.map((provider) => (
            <SsoProviderButton
              key={provider}
              provider={provider}
              label={`Continue with ${PROVIDER_LABEL[provider].company}`}
              loginHint={email.trim()}
              domainHint={provider === "google" ? found.domain : undefined}
              onError={setError}
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
        Setting this up for your company?{" "}
        <Link href="/sign-up?type=company" className="font-medium text-primary hover:text-primary/80">
          Create a company workspace
        </Link>
      </p>
    </div>
  );
}
