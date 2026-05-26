"use client";

import type { JobsTabProps } from "../../types";
import { useEngineers } from "../hooks";

export type JobsEngineersProps = JobsTabProps;

export function EngineersUI({ jobs }: JobsEngineersProps) {
  const { total } = useEngineers(jobs);
  return (
    <div className="rounded-xl border border-border/60 bg-background p-6 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]">
      <h2 className="text-lg font-bold text-foreground">Our Engineers</h2>
      <p className="text-sm text-muted-foreground mt-2">{total} engineer records available.</p>
    </div>
  );
}
