"use client";

/**
 * switch-account/page.tsx — DEPRECATED
 * ─────────────────────────────────────────────────────────────
 * The client-switching concept has been removed.
 * This page now simply redirects to /dashboard.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SwitchAccountPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    </div>
  );
}
