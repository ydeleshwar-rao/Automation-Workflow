"use client";

import React, { useState } from "react";
import { ArrowLeft, Play, Save, CheckCircle2, Circle, PauseCircle, History, Loader2, FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/src/lib/utils";
import type { AiWorkflowListItem } from "@/src/lib/ai-workflow/types";

interface CanvasToolbarProps {
  workflow: AiWorkflowListItem | undefined;
  isSaving: boolean;
  isRunning: boolean;
  onSave: () => void;
  onRun: () => void;
  onOpenHarnessTest: () => void;
  onNameChange: (name: string) => void;
}

const STATUS_CONFIG = {
  draft:  { label: "Draft",  Icon: Circle,       color: "text-muted-foreground" },
  active: { label: "Active", Icon: CheckCircle2, color: "text-success" },
  paused: { label: "Paused", Icon: PauseCircle,  color: "text-warning" },
} as const;

export function CanvasToolbar({
  workflow,
  isSaving,
  isRunning,
  onSave,
  onRun,
  onOpenHarnessTest,
  onNameChange,
}: CanvasToolbarProps) {
  const router  = useRouter();
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(workflow?.name ?? "Untitled Workflow");

  const status = workflow?.status ?? "draft";
  const { label, Icon, color } = STATUS_CONFIG[status];

  const commitName = () => {
    setEditing(false);
    if (nameVal.trim()) onNameChange(nameVal.trim());
  };

  return (
    <header className="h-14 flex items-center gap-3 px-4 bg-[hsl(var(--surface))] border-b border-black/8 dark:border-white/5 shrink-0 z-20">
      {/* Back */}
      <button
        onClick={() => router.push("/dashboard/ai-workflow")}
        className="nm-btn flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      {/* Separator */}
      <div className="w-px h-5 bg-black/10 dark:bg-white/10" />

      {/* Workflow name (editable) */}
      {editing ? (
        <input
          autoFocus
          value={nameVal}
          onChange={(e) => setNameVal(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && commitName()}
          className="nm-inset rounded-lg px-2 h-8 text-[14px] font-bold text-foreground focus:outline-none w-[220px]"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-[14px] font-bold text-foreground hover:text-primary transition-colors max-w-[220px] truncate"
        >
          {nameVal}
        </button>
      )}

      {/* Status badge */}
      <div className={cn(
        "flex items-center gap-1 px-2 py-1 nm-inset rounded-lg text-[11px] font-bold",
        color
      )}>
        <Icon className="w-3 h-3" />
        {label}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* History */}
      <button className="nm-btn h-8 w-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-all">
        <History className="w-4 h-4" />
      </button>

      <button
        onClick={onOpenHarnessTest}
        className="nm-btn h-8 px-3 rounded-xl text-[12px] font-bold flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-all"
      >
        <FlaskConical className="w-3.5 h-3.5" />
        Harness
      </button>

      {/* Save */}
      <button
        onClick={onSave}
        disabled={isSaving}
        className={cn(
          "nm-btn h-8 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-all",
          isSaving ? "opacity-60 cursor-not-allowed text-muted-foreground" : "text-foreground hover:text-primary"
        )}
      >
        {isSaving
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>
          : <><Save className="w-3.5 h-3.5" />Save</>
        }
      </button>

      {/* Run */}
      <button
        onClick={onRun}
        disabled={isRunning}
        className={cn(
          "flex items-center gap-1.5 h-8 px-4 rounded-xl text-[12px] font-bold text-primary-foreground transition-all",
          "bg-primary border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]",
          "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[5px_5px_0_hsl(var(--foreground))]",
          "dark:border-border dark:shadow-[3px_3px_0_hsl(var(--border))] dark:hover:shadow-[5px_5px_0_hsl(var(--border))]",
          isRunning && "opacity-70 cursor-not-allowed"
        )}
      >
        {isRunning
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running…</>
          : <><Play className="w-3.5 h-3.5 fill-current" />Run</>
        }
      </button>
    </header>
  );
}
