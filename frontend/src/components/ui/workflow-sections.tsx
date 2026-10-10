"use client";

import React from "react";
import { ChevronDown, CheckCircle2, LucideIcon, Plus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { cn } from "@/src/lib/utils";
import { CardSkeleton } from "./skeleton-loader";

interface WorkflowSectionProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function WorkflowSection({ label, required = false, children, className }: WorkflowSectionProps) {
  return (
    <div className={cn("space-y-3 relative", className)}>
      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
        {label} {required && <span className="text-orange-600">*</span>}
      </label>
      {children}
    </div>
  );
}

interface AppSectionProps {
  appName: string;
  appIcon: LucideIcon;
  onOverride?: () => void;
}

export function AppSection({ appName, appIcon: AppIcon, onOverride }: AppSectionProps) {
  return (
    <WorkflowSection label="App">
      <div className="flex items-center gap-3 p-1.5 pl-3 bg-white border border-[#f4a17e] rounded-lg shadow-sm">
        <div className="p-1.5 rounded-md bg-white border border-slate-100 shadow-sm">
          <AppIcon className="w-5 h-5 text-[#f4a17e]" />
        </div>
        <span className="text-sm font-bold text-slate-800 flex-1">
          {appName}
        </span>
        {onOverride && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onOverride}
            className="bg-[#4f46e5] text-white hover:bg-[#4338ca] font-bold text-xs h-8 px-4 rounded-md"
          >
            Change
          </Button>
        )}
      </div>
    </WorkflowSection>
  );
}

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
          "flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm cursor-pointer transition-all hover:border-slate-300 active:scale-[0.99]",
          isOpen && "border-[#4f46e5] ring-1 ring-[#4f46e5]/10"
        )}
      >
        <span className={cn("text-sm", value ? "text-slate-900 font-medium" : "text-slate-500")}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </div>
    </WorkflowSection>
  );
}

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
  isLoadingAccounts
}: AccountSectionProps) {
  return (
    <WorkflowSection label="Account">
      <div 
        onClick={onOpenPopup}
        className={cn(
           "flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm cursor-pointer transition-all hover:border-slate-300 active:scale-[0.99] group min-h-[56px]",
           isOpen && "border-[#4f46e5] ring-1 ring-[#4f46e5]/10"
        )}
      >
        {selectedAccountName ? (
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium text-slate-900">{selectedAccountName}</span>
            {isConnected && (
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-tight">Connected</span>
            )}
          </div>
        ) : isLoadingAccounts ? (
          <CardSkeleton />
        ) : (
          <div className="flex flex-col text-left py-1">
            <span className="text-sm font-medium text-slate-400">Connect your account</span>
          </div>
        )}
        <div className="flex items-center gap-1">
           {isConnected && <CheckCircle2 className="w-4 h-4 text-green-500" />}
           <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onChange();
            }}
            className="h-8 px-2 text-slate-600 border border-slate-200 hover:bg-slate-50 font-bold text-[11px] ml-4"
           >
              Change
           </Button>
        </div>
      </div>
    </WorkflowSection>
  );
}

interface ConfigFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onPlusClick: (e: React.MouseEvent) => void;
  onChange: (val: string) => void;
  info?: string;
  error?: string;
}

export function ConfigField({ 
  label, 
  value, 
  placeholder, 
  required, 
  onPlusClick, 
  onChange,
  info,
  error
}: ConfigFieldProps) {
  return (
    <WorkflowSection label={label} required={required}>
      <div className="relative group">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Enter text or insert data..."}
          className={cn(
            "h-11 pr-[130px] bg-white border-slate-200 rounded-lg focus-visible:ring-2 focus-visible:ring-[#4f46e5]/10 focus-visible:border-[#4f46e5] transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal",
            error && "border-red-500 focus-visible:ring-red-500/20"
          )}
          onKeyDown={(e) => {
            if (e.key === '/') {
              e.preventDefault();
              onPlusClick(e as any);
            }
          }}
        />
        <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-400 font-medium pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
          <span className="bg-white border border-slate-200 px-1 rounded shadow-sm text-slate-500">/</span >
          <span>for field mapping</span>
        </div>
        <button
          onClick={onPlusClick}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md border border-slate-100 bg-slate-50 text-slate-400 hover:text-[#4f46e5] hover:border-[#4f46e5] hover:bg-white transition-all shadow-sm group-focus-within:border-slate-200"
          type="button"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1 duration-200">{error}</p>}
    </WorkflowSection>
  );
}

interface ConfigTextAreaProps extends Omit<ConfigFieldProps, "onChange"> {
  onChange: (val: string) => void;
  rows?: number;
}

export function ConfigTextArea({ 
  label, 
  value, 
  placeholder, 
  required, 
  onPlusClick, 
  onChange,
  rows = 4,
  error
}: ConfigTextAreaProps) {
  return (
    <WorkflowSection label={label} required={required}>
      <div className="relative group">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Enter text or insert data..."}
          rows={rows}
          className={cn(
            "w-full p-3 pr-12 bg-white border border-slate-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/10 focus-visible:border-[#4f46e5] transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal resize-none min-h-[100px]",
            error && "border-red-500 focus-visible:ring-red-500/20"
          )}
          onKeyDown={(e) => {
            if (e.key === '/') {
              e.preventDefault();
              onPlusClick(e as any);
            }
          }}
        />
        <div className="absolute right-10 top-3 flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-400 font-medium pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
          <span className="bg-white border border-slate-200 px-1 rounded shadow-sm text-slate-500">/</span >
          <span>for field mapping</span>
        </div>
        <button
          onClick={onPlusClick}
          className="absolute right-2 top-3 w-7 h-7 flex items-center justify-center rounded-md border border-slate-100 bg-slate-50 text-slate-400 hover:text-[#4f46e5] hover:border-[#4f46e5] hover:bg-white transition-all shadow-sm"
          type="button"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1 duration-200">{error}</p>}
    </WorkflowSection>
  );
}
