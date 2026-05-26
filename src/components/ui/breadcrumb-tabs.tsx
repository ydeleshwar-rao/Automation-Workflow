"use client";

import * as React from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/utils";

export type StepStatus = "completed" | "active" | "pending";

export interface BreadcrumbStep {
  id: string;
  label: string;
}

interface BreadcrumbTabsProps {
  steps: BreadcrumbStep[];
  onStepClick: (id: any) => void;
  getStepStatus: (id: any) => StepStatus;
  className?: string;
}

export function BreadcrumbTabs({
  steps,
  onStepClick,
  getStepStatus,
  className,
}: BreadcrumbTabsProps) {
  return (
    <div
      className={cn(
        "flex-shrink-0 flex items-center gap-0 overflow-x-auto border-b border-border/60 bg-background px-5 py-0 no-scrollbar",
        className
      )}
    >
      {steps.map((step, idx) => {
        const status = getStepStatus(step.id);
        const isActive = status === "active";
        
        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => onStepClick(step.id)}
              className={cn(
                "group relative flex items-center gap-1.5 whitespace-nowrap px-0 py-2.5 transition-all",
                isActive ? "opacity-100" : "opacity-60 hover:opacity-100"
              )}
            >
              <span
                className={cn(
                  "text-xs font-semibold tracking-tight",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              
              {status === "completed" && (
                <Check className="h-3 w-3 text-primary stroke-[3]" />
              )}

              {/* Active Indicator Line */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-primary" />
              )}
            </button>
            
            {idx < steps.length - 1 && (
              <ChevronRight className="mx-3 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
