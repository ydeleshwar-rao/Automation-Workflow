"use client";

import React from "react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import type { StepFooterConfig } from "../../uiOrchestrator/types";

const BUTTON_BASE_CLASS = "font-bold h-12 rounded-xl transition-all";
const ENABLED_CLASS = "bg-primary text-primary-foreground hover:bg-primary/90";
const DISABLED_CLASS = "bg-muted text-muted-foreground cursor-not-allowed";

interface StepFooterProps {
  /** Set by the active integration; null means the default Continue button. */
  footerConfig: StepFooterConfig | null;
  /** Default button looks disabled until an event is chosen on the setup step. */
  isAwaitingEventSelection: boolean;
  onContinue: () => void;
}

/** The step sidebar's footer: integration-defined controls or a Continue button. */
export function StepFooter({ footerConfig, isAwaitingEventSelection, onContinue }: StepFooterProps) {
  if (footerConfig?.layout === "test-controls") {
    return (
      <div className="flex gap-3 w-full">
        <Button onClick={footerConfig.onTestTrigger} className={cn(BUTTON_BASE_CLASS, "flex-1 shadow-sm", ENABLED_CLASS)}>
          Test trigger
        </Button>
        <Button
          onClick={onContinue}
          variant="outline"
          className={cn(BUTTON_BASE_CLASS, "flex-1 border-border text-foreground hover:bg-muted")}
        >
          Continue
        </Button>
      </div>
    );
  }

  if (footerConfig) {
    return (
      <Button
        onClick={onContinue}
        disabled={footerConfig.disabled}
        className={cn(
          "continue-btn w-full shadow-sm",
          BUTTON_BASE_CLASS,
          footerConfig.disabled ? cn(DISABLED_CLASS, "border border-border") : ENABLED_CLASS
        )}
      >
        {footerConfig.label}
      </Button>
    );
  }

  return (
    <Button
      onClick={onContinue}
      className={cn("w-full shadow-sm", BUTTON_BASE_CLASS, isAwaitingEventSelection ? DISABLED_CLASS : ENABLED_CLASS)}
    >
      Continue
    </Button>
  );
}
