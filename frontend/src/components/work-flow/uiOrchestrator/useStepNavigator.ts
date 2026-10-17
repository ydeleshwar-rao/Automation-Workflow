import { useCallback } from "react";
import { toast } from "sonner";
import {
  useSaveMappingsMutation,
  useUpdateNodeMutation,
  type WorkflowNodeRecord,
} from "../apiIntegrations/workflowApi";
import { webhookEngine } from "../appEvents/webhook/apiIntegrations/webhook.engine";
import type { WorkflowNodeData } from "./types";
import type { NodePanels } from "./useNodePanels";
import type { WorkflowCanvas } from "./useWorkflowCanvas";
import {
  extractFieldMappings,
  extractOutputSchema,
  findTriggerNode,
  resolveConfigForSave,
  toSnakeCaseKey,
} from "./workflowNode.utils";

const NODE_SAVE_FAILED_MESSAGE = "Could not save this step. Check your connection and try again.";
const SELECT_EVENT_FIRST_MESSAGE = "Please select an event first";

function isWebhookTrigger(node: WorkflowNodeData): boolean {
  return node.type === "trigger" && Boolean(node.appLabel?.toLowerCase().includes("webhook"));
}

/**
 * The step sidebar's "Continue": setup → configure → test → next node.
 * Each step saves what it collected; a failed save keeps the user on the step.
 */
export function useStepNavigator(
  workflowId: string | null,
  userId: string,
  canvas: WorkflowCanvas,
  panels: NodePanels
) {
  const { nodes, activeNode, activeDescriptor, handleUpdateNodeData, goToNextNode } = canvas;
  const { activeStep, setActiveStep } = panels;
  const [updateNodeRequest] = useUpdateNodeMutation();
  const [saveMappingsRequest] = useSaveMappingsMutation();

  /** Returns false (after telling the user) when the save failed. */
  const saveNodePatch = useCallback(
    async (nodeId: string, patch: Partial<WorkflowNodeRecord>): Promise<boolean> => {
      try {
        await updateNodeRequest({ id: nodeId, patch }).unwrap();
        return true;
      } catch {
        toast.error(NODE_SAVE_FAILED_MESSAGE);
        return false;
      }
    },
    [updateNodeRequest]
  );

  /** Creates the trigger's webhook and links its id to the node. */
  const setUpWebhookTrigger = useCallback(
    async (node: WorkflowNodeData): Promise<boolean> => {
      const webhook = await webhookEngine.onSetup?.({ ...node, workflowId: workflowId ?? undefined, userId: userId || undefined });
      if (!webhook) return true;
      handleUpdateNodeData(node.id, { webhook });
      return saveNodePatch(node.id, {
        action_key: node.eventLabel ? toSnakeCaseKey(node.eventLabel) : "",
        config: { webhook_id: webhook.id },
      });
    },
    [workflowId, userId, handleUpdateNodeData, saveNodePatch]
  );

  /** Saves the chosen event; action nodes also save credentials/config collected during setup. */
  const saveSetupStep = useCallback(
    async (node: WorkflowNodeData): Promise<boolean> => {
      if (isWebhookTrigger(node)) return setUpWebhookTrigger(node);

      const patch: Partial<WorkflowNodeRecord> = {};
      if (node.eventLabel) patch.action_key = toSnakeCaseKey(node.eventLabel);
      if (node.type === "action" && node.config && Object.keys(node.config).length > 0) patch.config = node.config;
      return Object.keys(patch).length === 0 || saveNodePatch(node.id, patch);
    },
    [setUpWebhookTrigger, saveNodePatch]
  );

  /** Saves the configured form (only once it is valid) and, for actions, its field mappings. */
  const saveConfigureStep = useCallback(
    async (node: WorkflowNodeData): Promise<boolean> => {
      const { _formIsValid: isFormValid, ...formConfig } = node.config ?? {};
      if (isFormValid) {
        const isSaved = await saveNodePatch(node.id, {
          config: formConfig,
          sample_payload: resolveConfigForSave(formConfig),
          output_schema: extractOutputSchema(formConfig),
        });
        if (!isSaved) return false;
      }

      if (node.type !== "action" || !node.config) return true;
      const mappings = extractFieldMappings(node.config, findTriggerNode(nodes)?.id ?? "");
      if (mappings.length === 0) return true;
      try {
        await saveMappingsRequest({ nodeId: node.id, mappings }).unwrap();
        return true;
      } catch {
        toast.error(NODE_SAVE_FAILED_MESSAGE);
        return false;
      }
    },
    [nodes, saveNodePatch, saveMappingsRequest]
  );

  const handleContinue = useCallback(async () => {
    if (!activeNode) return;
    const lifecycle = activeDescriptor?.lifecycle;

    if (activeStep === "setup") {
      const canAdvance = (await lifecycle?.onSetupContinue?.(activeNode)) ?? true;
      if (!canAdvance) return void toast.error(SELECT_EVENT_FIRST_MESSAGE);
      if (await saveSetupStep(activeNode)) setActiveStep("configure");
      return;
    }

    if (activeStep === "configure") {
      const canAdvance = (await lifecycle?.onConfigureContinue?.(activeNode)) ?? true;
      if (canAdvance && (await saveConfigureStep(activeNode))) setActiveStep("test");
      return;
    }

    goToNextNode(activeNode.id);
    toast.success(`Step "${activeNode.label}" completed!`);
  }, [activeNode, activeDescriptor, activeStep, setActiveStep, saveSetupStep, saveConfigureStep, goToNextNode]);

  return { handleContinue };
}
