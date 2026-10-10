"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function GhlOAuthCallbackContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const origin = window.location.origin;
    const error = searchParams.get("error");
    const opener = window.opener;
    if (!opener) return;

    if (error) {
      opener.postMessage(
        {
          type: "GHL_CONNECT_ERROR",
          message: decodeURIComponent(error),
        },
        origin,
      );
    } else {
      opener.postMessage({ type: "GHL_CONNECT_SUCCESS" }, origin);
    }

    const t = window.setTimeout(() => window.close(), 800);
    return () => window.clearTimeout(t);
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">Finishing LeadsHub connection…</p>
    </div>
  );
}

export default function GhlOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <GhlOAuthCallbackContent />
    </Suspense>
  );
}
