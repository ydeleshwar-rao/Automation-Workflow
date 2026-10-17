import { useMemo } from "react";
import type { StepContext, WorkflowEvent, WorkflowNodeData } from "./types";
import type { VariablePickerItem } from "./workflowNode.utils";
import { findTriggerNode, getTriggerSamplePayload } from "./workflowNode.utils";

/** Lets the step sidebar finish unmounting before the app selector slides in. */
const APP_SELECTOR_REOPEN_DELAY_MS = 100;

interface UseStepContextOptions {
  nodes: WorkflowNodeData[];
  activeNode: WorkflowNodeData | undefined;
  events: WorkflowEvent[];
  triggerFields: VariablePickerItem[];
  workflowId: string | null;
  handleEventSelect: (nodeId: string, eventLabel: string) => void;
  handleUpdateNodeData: (nodeId: string, configPatch: Record<string, unknown>) => void;
  handleContinue: () => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setIsSelectorOpen: (isOpen: boolean) => void;
}

/**
 * The context every integration step receives. Memoised so integrations' own
 * memoised props (e.g. their footer) stay stable between renders.
 */
export function useStepContext({
  nodes,
  activeNode,
  events,
  triggerFields,
  workflowId,
  handleEventSelect,
  handleUpdateNodeData,
  handleContinue,
  setIsSidebarOpen,
  setIsSelectorOpen,
}: UseStepContextOptions): StepContext | null {
  const triggerNode = findTriggerNode(nodes);
  const triggerConfig = triggerNode?.config;
  const triggerWebhookId: string | undefined = triggerConfig?.webhook?.id ?? triggerConfig?.webhook_id;
  const triggerTestPayload = getTriggerSamplePayload(triggerNode);
  const triggerTestSamples = Array.isArray(triggerConfig?.testSamples) ? (triggerConfig.testSamples as unknown[]) : undefined;
  const triggerNodeId = triggerNode?.id;

  return useMemo(() => {
    if (!activeNode) return null;
    const activeNodeId = activeNode.id;
    return {
      // Integrations read the workflow id from the node
      node: { ...activeNode, workflowId: activeNode.workflowId ?? workflowId ?? undefined },
      events,
      selectedEvent: activeNode.eventLabel ?? null,
      onEventSelect: (eventLabel: string) => handleEventSelect(activeNodeId, eventLabel),
      onChangeApp: () => {
        setIsSidebarOpen(false);
        setTimeout(() => setIsSelectorOpen(true), APP_SELECTOR_REOPEN_DELAY_MS);
      },
      isTrigger: activeNode.type === "trigger",
      onSkipTest: handleContinue,
      onFormDataChange: (configPatch: Record<string, unknown>) => handleUpdateNodeData(activeNodeId, configPatch),
      triggerFields,
      triggerWebhookId,
      triggerTestPayload,
      triggerTestSamples,
      triggerNodeId,
    };
  }, [
    activeNode,
    workflowId,
    events,
    triggerFields,
    triggerWebhookId,
    triggerTestPayload,
    triggerTestSamples,
    triggerNodeId,
    handleEventSelect,
    handleUpdateNodeData,
    handleContinue,
    setIsSidebarOpen,
    setIsSelectorOpen,
  ]);
}
