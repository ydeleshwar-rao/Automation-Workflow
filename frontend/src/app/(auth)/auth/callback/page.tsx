"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { completeSsoCallback, lastSsoIntent } from "@/src/lib/auth/provider";
import { persistLoginResponse } from "@/src/services/auth.service";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [backHref, setBackHref] = useState("/login");

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      try {
        const result = await completeSsoCallback();
        if (cancelled) return;

        if (result.intent === "connect") {
          window.location.assign("/admin/sso?connected=1");
          return;
        }

        persistLoginResponse(result.data as Parameters<typeof persistLoginResponse>[0]);
        window.location.assign("/dashboard");
      } catch (err: unknown) {
        if (cancelled) return;
        // A failed "connect" started from the admin page should go back there
        const intent = lastSsoIntent();
        if (intent === "connect") setBackHref("/admin/sso");
        if (intent === "company-setup") setBackHref("/sign-up?type=company");
        setError(err instanceof Error ? err.message : "Sign-in failed");
      }
    }

    finishSignIn();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-border/70 bg-card p-6 text-center shadow-sm">
        {!error ? (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <h1 className="mt-4 text-lg font-semibold text-foreground">Finishing sign-in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account is being connected securely.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-foreground">Sign-in failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Link
              href={backHref}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              {backHref === "/admin/sso" ? "Back to Company SSO" : backHref === "/login" ? "Back to sign in" : "Back to company setup"}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
