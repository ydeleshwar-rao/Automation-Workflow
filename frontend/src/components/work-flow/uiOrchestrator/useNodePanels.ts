import { useCallback, useState } from "react";
import type { ConfigStep } from "../components/event-sidebar/eventSidebar";
import type { WorkflowNodeData } from "./types";

/** Which node is being edited and which panel (app selector or step sidebar) is showing. */
export function useNodePanels() {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<ConfigStep>("setup");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /** Nodes without an app open the app selector; configured nodes open the step sidebar at "setup". */
  const openNode = useCallback((node: Pick<WorkflowNodeData, "id" | "appLabel">) => {
    setActiveNodeId(node.id);
    setActiveStep("setup");
    setIsSelectorOpen(!node.appLabel);
    setIsSidebarOpen(Boolean(node.appLabel));
  }, []);

  const showStepSidebar = useCallback(() => {
    setIsSelectorOpen(false);
    setIsSidebarOpen(true);
    setActiveStep("setup");
  }, []);

  const closePanels = useCallback(() => {
    setActiveNodeId(null);
    setActiveStep("setup");
    setIsSelectorOpen(false);
    setIsSidebarOpen(false);
  }, []);

  return {
    activeNodeId,
    setActiveNodeId,
    activeStep,
    setActiveStep,
    isSelectorOpen,
    setIsSelectorOpen,
    isSidebarOpen,
    setIsSidebarOpen,
    openNode,
    showStepSidebar,
    closePanels,
  };
}

export type NodePanels = ReturnType<typeof useNodePanels>;
