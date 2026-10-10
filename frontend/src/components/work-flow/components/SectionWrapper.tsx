"use client";

import React from "react";
import { cn } from "@/src/lib/utils";

interface SectionWrapperProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Generic labeled section wrapper used across all app event integrations
 * (mail, webhook, leadconnector, etc.)
 */
export function WorkflowSection({ label, required = false, children, className }: SectionWrapperProps) {
  return (
    <div className={cn("space-y-3 relative", className)}>
      <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
