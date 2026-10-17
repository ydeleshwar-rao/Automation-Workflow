"use client";

import React from "react";
import dynamic from "next/dynamic";
import { MonitorEmptyState } from "./BuilderPlaceholders";

function MonitorPaneFallback() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30">
      <div className="h-10 w-10 rounded-full border-2 border-border border-t-primary animate-spin" />
    </div>
  );
}

// The monitor is opened less often than the canvas, so its code loads on demand
const ExecutionList = dynamic(
  () => import("../ExecutionMonitor/ExecutionList").then((executionModule) => executionModule.ExecutionList),
  { ssr: false, loading: () => <MonitorPaneFallback /> }
);

const ExecutionDetail = dynamic(
  () => import("../ExecutionMonitor/ExecutionDetail").then((executionModule) => executionModule.ExecutionDetail),
  { ssr: false, loading: () => <MonitorPaneFallback /> }
);

interface MonitorViewProps {
  workflowId: string | null;
  activeExecutionId: string | null;
  onSelectExecution: (executionId: string | null) => void;
}

/** Execution history of the selected workflow: run list on the left, run detail on the right. */
export function MonitorView({ workflowId, activeExecutionId, onSelectExecution }: MonitorViewProps) {
  return (
    <div className="flex flex-1 overflow-hidden bg-[hsl(var(--surface))]">
      <div className="w-[400px] shrink-0 overflow-hidden flex flex-col nm-sidebar">
        {workflowId ? (
          <ExecutionList
            workflowId={workflowId}
            activeExecutionId={activeExecutionId}
            onSelectExecution={(executionId) => onSelectExecution(executionId)}
          />
        ) : (
          <MonitorEmptyState
            title="No workflow selected"
            hint="Create or select a workflow to view its executions."
            iconSizeClass="h-10 w-10"
          />
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeExecutionId ? (
          <ExecutionDetail executionId={activeExecutionId} onClose={() => onSelectExecution(null)} />
        ) : (
          <MonitorEmptyState
            title="Select an execution to view details"
            hint="Click a run from the list on the left."
            iconSizeClass="h-12 w-12"
          />
        )}
      </div>
    </div>
  );
}
