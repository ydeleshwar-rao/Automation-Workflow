import { useCallback, useEffect, useState } from "react";
import {
  getStoredActiveView,
  getStoredWorkflowId,
  setStoredActiveView,
  setStoredWorkflowId,
} from "./workflowStorage";

export type BuilderView = "builder" | "monitor";

/**
 * Which workflow, view and execution the builder page shows. Page-local UI state;
 * the workflow id and view survive a refresh via localStorage.
 */
export function useWorkflowSelection() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(getStoredWorkflowId);
  const [activeView, setActiveViewState] = useState<BuilderView>(() => getStoredActiveView() ?? "builder");
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);

  useEffect(() => {
    setStoredWorkflowId(selectedWorkflowId);
  }, [selectedWorkflowId]);

  const setActiveView = useCallback((view: BuilderView) => {
    setStoredActiveView(view);
    setActiveViewState(view);
  }, []);

  return {
    selectedWorkflowId,
    selectWorkflow: setSelectedWorkflowId,
    activeView,
    setActiveView,
    activeExecutionId,
    setActiveExecutionId,
  };
}
