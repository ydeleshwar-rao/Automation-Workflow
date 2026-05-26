"use client";

import React from "react";
import { ChevronDown, CheckCircle2, LucideIcon } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { CardSkeleton } from "@/src/components/ui/skeleton-loader";
import { WorkflowSection } from "../../../../components/SectionWrapper";

// ---------------------------------------------------------------------------
// AppSection
// Displays the currently selected app with an optional "Change" button
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
      <div className="flex items-center gap-3 p-1.5 pl-3 bg-card border border-border rounded-lg shadow-sm">
        <div className="p-1.5 rounded-md bg-muted/40 border border-border/60 shadow-sm">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={onOverride}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs h-8 px-4 rounded-md"
          >
            Change
          </Button>
        )}
      </div>
    </WorkflowSection>
  );
}

// ---------------------------------------------------------------------------
// SelectSection
// A styled clickable dropdown row for selecting an event or other single value
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
          "flex items-center justify-between p-3.5 bg-card border border-border rounded-lg shadow-sm cursor-pointer transition-all hover:border-primary/40 active:scale-[0.99]",
          isOpen && "border-primary ring-1 ring-primary/20"
        )}
      >
        <span className={cn("text-sm", value ? "text-foreground font-medium" : "text-muted-foreground")}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </div>
    </WorkflowSection>
  );
}

// ---------------------------------------------------------------------------
// AccountSection
// Displays the connected account status with a "Change" button
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
          "flex items-center justify-between p-3.5 bg-card border border-border rounded-lg shadow-sm cursor-pointer transition-all hover:border-primary/40 active:scale-[0.99] group min-h-[56px]",
          isOpen && "border-primary ring-1 ring-primary/20"
        )}
      >
        {selectedAccountName ? (
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium text-foreground">{selectedAccountName}</span>
            {isConnected && (
              <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-tight">Connected</span>
            )}
          </div>
        ) : isLoadingAccounts ? (
          <CardSkeleton />
        ) : (
          <div className="flex flex-col text-left py-1">
            <span className="text-sm font-medium text-muted-foreground">Connect your account</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          {isConnected && <CheckCircle2 className="w-4 h-4 text-success" />}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onChange();
            }}
            className="h-8 px-2 text-foreground border border-border hover:bg-muted font-bold text-[11px] ml-4"
          >
            Change
          </Button>
        </div>
      </div>
    </WorkflowSection>
  );
}
