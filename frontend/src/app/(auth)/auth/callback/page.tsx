"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { completeSsoCallback, lastSsoIntent } from "@/src/lib/auth/provider";
import { persistLoginResponse } from "@/src/services/auth.service";

/**
 * Google / Microsoft send the user back here with the sign-in token.
 * The page stays blank while the token is exchanged with the backend; a spinner
 * appears only if that takes noticeably long, and a card only on failure.
 */
const SPINNER_DELAY_MS = 1500;

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [backHref, setBackHref] = useState("/login");

  useEffect(() => {
    let cancelled = false;
    const slowTimer = setTimeout(() => setSlow(true), SPINNER_DELAY_MS);
    router.prefetch("/dashboard");

    async function finishSignIn() {
      try {
        const result = await completeSsoCallback();
        if (cancelled) return;

        if (result.intent === "connect") {
          router.replace("/admin/sso?connected=1");
          return;
        }

        persistLoginResponse(result.data);
        router.replace("/dashboard");
      } catch (signInError: unknown) {
        if (cancelled) return;
        clearTimeout(slowTimer);
        // Send the user back to where the sign-in started
        const intent = lastSsoIntent();
        if (intent === "connect") setBackHref("/admin/sso");
        if (intent === "company-setup") setBackHref("/sign-up?type=company");
        setError(signInError instanceof Error ? signInError.message : "Sign-in failed");
      }
    }

    finishSignIn();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [router]);

  if (!error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" aria-busy="true">
        {slow && <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Signing in" />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-border/70 bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Sign-in failed</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Link
          href={backHref}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
        >
          {backHref === "/admin/sso" ? "Back to Company SSO" : backHref === "/login" ? "Back to sign in" : "Back to company setup"}
        </Link>
      </div>
    </div>
  );
}
