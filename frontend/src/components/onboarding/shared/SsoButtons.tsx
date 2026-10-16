"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  PROVIDER_LABEL,
  SSO_PROVIDERS,
  startSsoSignIn,
  type SsoIntent,
  type SsoProvider,
} from "@/src/lib/auth/provider";

export function GoogleLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function MicrosoftLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 23 23" className={className} aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  );
}

const LOGOS: Record<SsoProvider, typeof GoogleLogo> = { google: GoogleLogo, microsoft: MicrosoftLogo };

type SsoProviderButtonProps = {
  provider: SsoProvider;
  intent?: SsoIntent;
  label?: string;
  organizationName?: string;
  loginHint?: string;
  domainHint?: string;
  /** Called before redirecting; return an error message to stop. */
  validate?: () => string | null;
  onError?: (message: string) => void;
};

export function SsoProviderButton({
  provider,
  intent = "signin",
  label,
  organizationName,
  loginHint,
  domainHint,
  validate,
  onError,
}: SsoProviderButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const Logo = LOGOS[provider];
  const text = label ?? `Continue with ${PROVIDER_LABEL[provider][intent === "signin" ? "personal" : "company"]}`;

  const handleClick = async () => {
    if (isLoading) return;
    const problem = validate?.();
    if (problem) return onError?.(problem);

    setIsLoading(true);
    try {
      await startSsoSignIn(provider, { intent, organizationName, loginHint, domainHint });
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : "Sign-in failed");
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="w-full min-w-0 rounded-xl border border-border/70 bg-background px-3 py-3 text-sm font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2.5"
    >
      {isLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Logo className="h-4 w-4 shrink-0" />}
      <span className="truncate">{isLoading ? `Opening ${PROVIDER_LABEL[provider].personal}…` : text}</span>
    </button>
  );
}

/**
 * Google + Microsoft buttons side by side (stacked when only one is available),
 * labelled with the provider name, with a shared error line underneath.
 */
export function SsoButtons({
  intent = "signin",
  organizationName,
  validate,
  labels,
  className = "",
}: {
  intent?: SsoIntent;
  organizationName?: string;
  validate?: () => string | null;
  labels?: Partial<Record<SsoProvider, string>>;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const providers = SSO_PROVIDERS;

  const kind = intent === "signin" ? "personal" : "company";

  return (
    <div className={className}>
      <div className={providers.length > 1 ? "grid grid-cols-2 gap-3" : "flex flex-col"}>
        {providers.map((provider) => (
          <SsoProviderButton
            key={provider}
            provider={provider}
            intent={intent}
            label={labels?.[provider] ?? (providers.length > 1 ? PROVIDER_LABEL[provider][kind] : undefined)}
            organizationName={organizationName}
            validate={validate}
            onError={setError}
          />
        ))}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
