// features/integrations/webhook/webhook.engine.ts

import { store } from "@/src/store/store"
import { webhookApi } from "./webhookApi"
import { IntegrationEngine } from "../../../apiIntegrations/types/integration.types"
import { CreateWebhookResponse } from "./types/webhookApis.type"
import { getStoredWebhookData, setStoredWebhookData } from "../../../uiOrchestrator/workflowStorage"


/** Persist webhook data to localStorage for a given node ID */
export function cacheWebhookData(nodeId: string, data: CreateWebhookResponse) {
  setStoredWebhookData(nodeId, data);
}

/** Retrieve cached webhook data for a node ID, or null if not found */
export function getCachedWebhookData(nodeId: string): CreateWebhookResponse | null {
  return getStoredWebhookData(nodeId);
}

export const webhookEngine: IntegrationEngine<CreateWebhookResponse> = {
  onSetup: async (eventData) => {
    const payload = {
      name: `${eventData.appLabel} Trigger`,
      action_type: "save_dbfigbgjk",
      workflow_id: eventData.workflowId,
      user_id: eventData.userId,
    }
    const result = await store.dispatch(webhookApi.endpoints.createWebhook.initiate(payload)).unwrap()
    const response = (result as any).data ?? result
    // Persist so the URL survives page refreshes
    cacheWebhookData(eventData.id, response);
    return response;
  },
}