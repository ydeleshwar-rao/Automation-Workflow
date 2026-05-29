"use client";

import React from "react";
import { ChevronDown, CheckCircle2, LucideIcon } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { CardSkeleton } from "@/src/components/ui/skeleton-loader";
import { WorkflowSection } from "../../../../components/SectionWrapper";

// ---------------------------------------------------------------------------
// AppSection
// ---------------------------------------------------------------------------

interface AppSectionProps {
  appName: string;
  appIcon: LucideIcon;
  onOverride?: () => void;
  connected?: boolean;
}

export function AppSection({ appName, appIcon: AppIcon, onOverride, connected }: AppSectionProps) {
  return (
    <WorkflowSection label="App">
      <div className="flex items-center gap-3 p-1.5 pl-3 nm-inset rounded-2xl">
        <div className="nm-card p-1.5 rounded-xl">
          <AppIcon className="w-5 h-5 text-primary" />
        </div>
        <span className="text-sm font-bold text-foreground flex-1">{appName}</span>
        {connected && (
          <div className="flex items-center gap-1 text-success mr-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-semibold">Connected</span>
          </div>
        )}
        {onOverride && (
          <button
            onClick={onOverride}
            className="nm-btn flex h-8 items-center rounded-xl px-3 text-xs font-semibold text-primary hover:text-primary/80 transition-all"
          >
            Change
          </button>
        )}
      </div>
    </WorkflowSection>
  );
}

// ---------------------------------------------------------------------------
// SelectSection
// ---------------------------------------------------------------------------

interface SelectSectionProps {
  label: string;
  value: string | null;
  placeholder: string;
  onClick: () => void;
  isOpen: boolean;
}

export function SelectSection({ label, value, placeholder, onClick, isOpen }: SelectSectionProps) {
  return (
    <WorkflowSection label={label}>
      <div
        onClick={onClick}
        className={cn(
          "flex items-center justify-between p-3.5 nm-inset rounded-xl cursor-pointer transition-all active:scale-[0.99]",
          isOpen && "outline outline-1 outline-primary/40"
        )}
      >
        <span className={cn("text-sm", value ? "text-foreground font-medium" : "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </div>
    </WorkflowSection>
  );
}

// ---------------------------------------------------------------------------
// AccountSection
// ---------------------------------------------------------------------------

interface AccountSectionProps {
  selectedAccountName: string | null;
  isConnected?: boolean;
  onOpenPopup: () => void;
  isOpen: boolean;
  onChange: () => void;
  isLoadingAccounts?: boolean;
}

export function AccountSection({
  selectedAccountName,
  isConnected,
  onOpenPopup,
  isOpen,
  onChange,
  isLoadingAccounts,
}: AccountSectionProps) {
  return (
    <WorkflowSection label="Account">
      <div
        onClick={onOpenPopup}
        className={cn(
          "flex items-center justify-between p-3.5 nm-inset rounded-xl cursor-pointer transition-all active:scale-[0.99] min-h-[56px]",
          isOpen && "outline outline-1 outline-primary/40"
        )}
      >
        {selectedAccountName ? (
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium text-foreground">{selectedAccountName}</span>
            {isConnected && (
              <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-tight">
                Connected
              </span>
            )}
          </div>
        ) : isLoadingAccounts ? (
          <CardSkeleton />
        ) : (
          <div className="flex flex-col text-left py-1">
            <span className="text-sm font-medium text-muted-foreground">Connect your account</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {isConnected && <CheckCircle2 className="w-4 h-4 text-success" />}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange();
            }}
            className="nm-btn flex h-7 items-center rounded-lg px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            Change
          </button>
        </div>
      </div>
    </WorkflowSection>
  );
}
