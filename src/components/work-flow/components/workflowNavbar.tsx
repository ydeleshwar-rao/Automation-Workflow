import { FlaskConical, LayoutDashboard, Library, Loader2, Send, Zap, Activity } from "lucide-react";
import { Button } from "../../ui/button";
import React from "react";
import Link from "next/link";
import { cn } from "@/src/lib/utils";
import { SaveAsTemplateButton } from "@/src/components/workflow-templates/components/SaveAsTemplateButton";


    interface WorkflowNavbarProps {
    workflows: {
        id: string;
        name: string;
        status: "draft" | "active" | "paused";
    }[],
    currentWorkflowId: string | null,
    setActiveView: (v: "builder" | "monitor") => void,
    activeView: "builder" | "monitor",
    publishWorkflow: () => Promise<void>,
    pauseWorkflow: () => Promise<void>,
    currentWorkflowStatus: "draft" | "active" | "paused",
    testWorkflow: () => Promise<void>,
    isTesting: boolean,
    }


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
    const isActive = currentWorkflowStatus === "active";
    // Derived workflow name
  const workflowName =
    workflows.find((w) => w.id === currentWorkflowId)?.name ?? "Untitled Workflow";
    return (
         <header className="z-30 flex h-14 shrink-0 items-center justify-between rounded-2xl border border-border/60 bg-background px-4 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]">

        {/* Left: brand + workflow name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <h1 className="hidden max-w-[200px] truncate text-sm font-semibold text-foreground sm:block">
              {workflowName}
            </h1>
          </div>

          {/* Builder / Monitor tabs */}
          <div className="ml-3 hidden items-center rounded-lg border border-border bg-muted/50 p-0.5 sm:flex">
            <button
              onClick={() => setActiveView("builder")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeView === "builder"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Builder
            </button>
            <button
              onClick={() => setActiveView("monitor")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeView === "monitor"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Activity className="h-3.5 w-3.5" />
              Monitor
            </button>
          </div>
        </div>

        {/* Right: status toggle + Test + Publish */}
        <div className="flex items-center gap-2">

          {/* Active / Paused radio toggle */}
          <div
            role="radiogroup"
            aria-label="Workflow status"
            className="hidden items-center rounded-lg border border-border bg-muted/50 p-0.5 sm:flex"
          >
            <label
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                isActive
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <input
                type="radio"
                name="workflow-status"
                value="active"
                checked={isActive}
                onChange={() => {
                  if (!isActive) publishWorkflow();
                }}
                disabled={!currentWorkflowId}
                className="sr-only"
              />
              ● Active
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                !isActive
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <input
                type="radio"
                name="workflow-status"
                value="paused"
                checked={!isActive}
                onChange={() => {
                  if (isActive) pauseWorkflow();
                }}
                disabled={!currentWorkflowId}
                className="sr-only"
              />
              ‖ Paused
            </label>
          </div>

          {/* Templates library link */}
          <Link
            href="/dashboard/workflow-templates"
            title="Browse workflow templates"
            className="hidden h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-all hover:bg-muted sm:inline-flex"
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
          <Button
            variant="outline"
            onClick={testWorkflow}
            disabled={isTesting}
            className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all"
          >
            {isTesting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FlaskConical className="h-3.5 w-3.5" />
            )}
            Test
          </Button>

          {/* Publish button */}
          <Button
            onClick={publishWorkflow}
            className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
          >
            <Send className="h-3.5 w-3.5" />
            Publish 
          </Button>
        </div>
      </header>
    )
}