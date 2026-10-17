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
  setActiveView:          (view: "builder" | "monitor") => void;
  activeView:             "builder" | "monitor";
  publishWorkflow:        () => Promise<void>;
  pauseWorkflow:          () => Promise<void>;
  currentWorkflowStatus:  "draft" | "active" | "paused";
  testWorkflow:           () => Promise<void>;
  isTesting:              boolean;
}

// nm-btn / nm-inset embed surface bg via CSS — no inline SURF needed

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
    workflows.find((workflow) => workflow.id === currentWorkflowId)?.name ?? "Untitled Workflow";

  return (
    <header className={cn(
      "nm-card z-30 flex h-11 shrink-0 items-center justify-between rounded-xl px-3",
    )}>

      {/* ── Left: brand + workflow name + view tabs ── */}
      <div className="flex items-center gap-2">

        {/* Brand icon + workflow name */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-3 w-3" />
          </div>
          <h1 className="hidden max-w-[180px] truncate text-[13px] font-semibold text-foreground sm:block">
            {workflowName}
          </h1>
        </div>

        {/* Builder / Monitor tab pill (nm-inset container, raised active tab) */}
        <div className={cn(
          "ml-1 hidden items-center gap-0.5 rounded-lg p-0.5 sm:flex",
          "nm-inset",
        )}>
          {(["builder", "monitor"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all capitalize",
                activeView === view
                  ? "nm-btn text-foreground"
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
      <div className="flex items-center gap-1.5">

        {/* Active / Paused status toggle (nm-inset container) */}
        <div
          role="radiogroup"
          aria-label="Workflow status"
          className={cn(
            "hidden items-center gap-0.5 rounded-lg p-0.5 sm:flex",
            "nm-inset",
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
                  "flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  checked
                    ? "nm-btn text-foreground"
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
            "hidden h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground transition-all sm:inline-flex",
            "nm-btn hover:text-foreground",
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
            "flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-all",
            "nm-btn text-muted-foreground hover:text-foreground",
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
            "nm-primary-btn flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold",
          )}
        >
          <Send className="h-3.5 w-3.5" />
          Publish
        </button>
      </div>
    </header>
  );
}
