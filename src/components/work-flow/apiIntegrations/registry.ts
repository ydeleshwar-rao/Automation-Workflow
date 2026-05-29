// features/integrations/registry.ts

import { webhookEngine } from "../appEvents/webhook/apiIntegrations/webhook.engine"


export const apiIntegrationRegistry: Record<string, any> = {
  Webhook: webhookEngine,

}