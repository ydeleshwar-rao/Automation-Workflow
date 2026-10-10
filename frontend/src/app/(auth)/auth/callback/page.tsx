"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { API_ROUTES } from "@/src/constants/api.constants";
import { createClient } from "@/src/lib/supabase/client";
import { persistLoginResponse } from "@/src/services/auth.service";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishGoogleSignIn() {
      try {
        const supabase = createClient();
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !data.session?.access_token) {
          throw new Error(sessionError?.message ?? "Google sign-in session was not found");
        }

        const { data: apiRes } = await axios.post(API_ROUTES.AUTH.GOOGLE, {
          access_token: data.session.access_token,
        }, {
          withCredentials: true,
        });

        if (!apiRes?.success) {
          throw new Error(apiRes?.message || "Google sign-in failed");
        }

        persistLoginResponse(apiRes.data);
        await supabase.auth.signOut();

        if (!cancelled) {
          window.location.assign("/dashboard");
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          axios.isAxiosError(err)
            ? err.response?.data?.message ?? err.message
            : err instanceof Error
              ? err.message
              : "Google sign-in failed";
        setError(message);
      }
    }

    finishGoogleSignIn();

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
              Your Google account is being connected securely.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-foreground">Google sign-in failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Link
              href="/login"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
