"use client";

/**
 * AccessReadyGate
 * ─────────────────────────────────────────────────────────────
 * Formerly "SelectClientGate" — the client-selection concept has
 * been removed. This component now simply shows a loading spinner
 * while the access state bootstraps (JWT decode + optional API
 * call for developer permissions), then renders children.
 *
 * No client selection is needed: every user operates on their own
 * data, scoped by their user_id in the backend.
 */

import { useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";

export function SelectClientGate({ children }: { children: React.ReactNode }) {
  const { status } = useSelector((s: RootState) => s.access);

  // Once ready at least once, never block children again for a transient
  // re-bootstrap (prevents sidebar clicks from looking like they don't route).
  const hasBeenReadyRef = useRef(false);
  if (status === "ready") hasBeenReadyRef.current = true;

  if (!hasBeenReadyRef.current && (status === "idle" || status === "loading")) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading workspace…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Alias for clarity — use this name in new code.
 */
export { SelectClientGate as AccessReadyGate };
