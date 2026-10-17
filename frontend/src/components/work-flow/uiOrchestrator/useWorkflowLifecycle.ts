import { useCallback } from "react";
import { toast } from "sonner";
import {
  useActivateWorkflowMutation,
  useCreatePollingSubscriptionMutation,
  useTestWorkflowMutation,
  useUpdateWorkflowMutation,
} from "../apiIntegrations/workflowApi";
import { useUpdateWebhookResponseMutation } from "../appEvents/webhook/apiIntegrations/webhookApi";
import type { WorkflowNodeData } from "./types";
import type { BuilderView } from "./useWorkflowSelection";
import { canAutoSubscribe, findTriggerNode, toEngineIntegrationKey, toSnakeCaseKey } from "./workflowNode.utils";

type WebhookMode = "live" | "test";

const SAVE_WORKFLOW_FIRST_MESSAGE = "Save your workflow first";

/** Publish, pause and test-run the selected workflow. */
export function useWorkflowLifecycle(
  workflowId: string | null,
  nodes: WorkflowNodeData[],
  setActiveView: (view: BuilderView) => void
) {
  const [activateWorkflowRequest] = useActivateWorkflowMutation();
  const [updateWorkflowRequest] = useUpdateWorkflowMutation();
  const [testWorkflowRequest, { isLoading: isTesting }] = useTestWorkflowMutation();
  const [updateWebhookResponseRequest] = useUpdateWebhookResponseMutation();
  const [createPollingSubscriptionRequest] = useCreatePollingSubscriptionMutation();

  /** Live mode runs the workflow on every incoming hit; test mode only captures samples. */
  const setTriggerWebhookMode = useCallback(
    async (mode: WebhookMode) => {
      const webhookId = findTriggerNode(nodes)?.config?.webhook?.id;
      if (!webhookId) return;
      await updateWebhookResponseRequest({ responseId: webhookId, payload: { mode } })
        .unwrap()
        .catch(() => undefined);
    },
    [nodes, updateWebhookResponseRequest]
  );

  /**
   * Subscribes polling/webhook-engine triggers so they start firing. Idempotent per node,
   * so re-publishing is safe; failures don't block publishing (Test can retry).
   */
  const subscribeTriggers = useCallback(
    async (publishedWorkflowId: string) => {
      for (const triggerNode of nodes.filter(canAutoSubscribe)) {
        const eventKey = toSnakeCaseKey(triggerNode.eventLabel ?? "");
        await createPollingSubscriptionRequest({
          workflow_id: publishedWorkflowId,
          node_id: triggerNode.id,
          integration_key: toEngineIntegrationKey(triggerNode.integrationType ?? ""),
          event_key: eventKey,
          config: triggerNode.config ?? {},
        })
          .unwrap()
          .catch((error: unknown) =>
            console.warn(`Auto-subscribe failed for node ${triggerNode.id} (${triggerNode.integrationType}/${eventKey})`, error)
          );
      }
    },
    [nodes, createPollingSubscriptionRequest]
  );

  const publishWorkflow = useCallback(async () => {
    if (!workflowId) return void toast.error(SAVE_WORKFLOW_FIRST_MESSAGE);
    try {
      await activateWorkflowRequest(workflowId).unwrap();
      await setTriggerWebhookMode("live");
      await subscribeTriggers(workflowId);
      toast.success("Workflow published and activated!");
    } catch {
      toast.error("Could not publish — backend unavailable");
    }
  }, [workflowId, activateWorkflowRequest, setTriggerWebhookMode, subscribeTriggers]);

  const pauseWorkflow = useCallback(async () => {
    if (!workflowId) return void toast.error(SAVE_WORKFLOW_FIRST_MESSAGE);
    try {
      await updateWorkflowRequest({ id: workflowId, patch: { status: "paused" } }).unwrap();
      await setTriggerWebhookMode("test");
      toast.success("Workflow paused");
    } catch {
      toast.error("Could not pause — backend unavailable");
    }
  }, [workflowId, updateWorkflowRequest, setTriggerWebhookMode]);

  const testWorkflow = useCallback(async () => {
    if (!workflowId) return void toast.error(SAVE_WORKFLOW_FIRST_MESSAGE);
    try {
      await testWorkflowRequest(workflowId).unwrap();
      toast.success("Test execution started — check the Monitor tab");
      setActiveView("monitor");
    } catch {
      toast.error("Test failed — backend unavailable");
    }
  }, [workflowId, testWorkflowRequest, setActiveView]);

  return { publishWorkflow, pauseWorkflow, testWorkflow, isTesting };
}
