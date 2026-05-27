import {
  FlaskConical, LayoutDashboard, Library,
  Loader2, Send, Zap, Activity,
} from "lucide-react";
import { Button } from "../../ui/button";
import React from "react";
import Link from "next/link";
import { cn } from "@/src/lib/utils";
import { SaveAsTemplateButton } from "@/src/components/workflow-templates/components/SaveAsTemplateButton";

interface WorkflowNavbarProps {
  workflows:              { id: string; name: string; status: "draft" | "active" | "paused" }[];
  currentWorkflowId:      string | null;
  setActiveView:          (v: "builder" | "monitor") => void;
  activeView:             "builder" | "monitor";
  publishWorkflow:        () => Promise<void>;
  pauseWorkflow:          () => Promise<void>;
  currentWorkflowStatus:  "draft" | "active" | "paused";
  testWorkflow:           () => Promise<void>;
  isTesting:              boolean;
}

// ── Shared surface bg token ───────────────────────────────────
const SURF = "bg-[hsl(var(--surface))]";

export default function WorkflowNavbar({
  workflows,
  currentWorkflowId,
  setActiveView,
  activeView,
  publishWorkflow,
  pauseWorkflow,
  currentWorkflowStatus,
  testWorkflow,
  isTesting,
}: WorkflowNavbarProps) {
  const isActive   = currentWorkflowStatus === "active";
  const workflowName =
    workflows.find((w) => w.id === currentWorkflowId)?.name ?? "Untitled Workflow";

  return (
    <header className={cn(
      "nm-card z-30 flex h-14 shrink-0 items-center justify-between rounded-2xl px-4",
    )}>

      {/* ── Left: brand + workflow name + view tabs ── */}
      <div className="flex items-center gap-3">

        {/* Brand icon + workflow name */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <h1 className="hidden max-w-[180px] truncate text-sm font-semibold text-foreground sm:block">
            {workflowName}
          </h1>
        </div>

        {/* Builder / Monitor tab pill (nm-inset container, raised active tab) */}
        <div className={cn(
          "ml-2 hidden items-center gap-0.5 rounded-xl p-1 sm:flex",
          "nm-inset", SURF,
        )}>
          {(["builder", "monitor"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all capitalize",
                activeView === view
                  ? "bg-card shadow-sm text-foreground dark:bg-card"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {view === "builder"
                ? <LayoutDashboard className="h-3.5 w-3.5" />
                : <Activity       className="h-3.5 w-3.5" />
              }
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: status + templates + test + publish ── */}
      <div className="flex items-center gap-2">

        {/* Active / Paused status toggle (nm-inset container) */}
        <div
          role="radiogroup"
          aria-label="Workflow status"
          className={cn(
            "hidden items-center gap-0.5 rounded-xl p-1 sm:flex",
            "nm-inset", SURF,
          )}
        >
          {([
            { value: "active",  label: "● Active" },
            { value: "paused",  label: "‖ Paused" },
          ] as const).map(({ value, label }) => {
            const checked = value === "active" ? isActive : !isActive;
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  checked
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <input
                  type="radio"
                  name="workflow-status"
                  value={value}
                  checked={checked}
                  onChange={() => {
                    if (value === "active" && !isActive) publishWorkflow();
                    if (value === "paused" && isActive)  pauseWorkflow();
                  }}
                  disabled={!currentWorkflowId}
                  className="sr-only"
                />
                {label}
              </label>
            );
          })}
        </div>

        {/* Templates link */}
        <Link
          href="/dashboard/workflow-templates"
          title="Browse workflow templates"
          className={cn(
            "hidden h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted-foreground transition-all sm:inline-flex",
            "nm-btn", SURF, "hover:text-foreground",
          )}
        >
          <Library className="h-3.5 w-3.5" />
          Templates
        </Link>

        {/* Save as Template */}
        <SaveAsTemplateButton
          workflowId={currentWorkflowId}
          workflowName={workflowName}
        />

        {/* Test button */}
        <button
          onClick={testWorkflow}
          disabled={isTesting}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all",
            "nm-btn", SURF, "text-muted-foreground hover:text-foreground",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          {isTesting
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <FlaskConical className="h-3.5 w-3.5" />
          }
          Test
        </button>

        {/* Publish button — primary, slightly raised */}
        <button
          onClick={publishWorkflow}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold transition-all",
            "bg-primary text-primary-foreground",
            "shadow-[3px_3px_8px_rgba(99,102,241,0.4),-2px_-2px_6px_rgba(255,255,255,0.1)]",
            "hover:bg-primary/90 hover:shadow-[4px_4px_10px_rgba(99,102,241,0.5),-3px_-3px_8px_rgba(255,255,255,0.12)]",
          )}
        >
          <Send className="h-3.5 w-3.5" />
          Publish
        </button>
      </div>
    </header>
  );
}
