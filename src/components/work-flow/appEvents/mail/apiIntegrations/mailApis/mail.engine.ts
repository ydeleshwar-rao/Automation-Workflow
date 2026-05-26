import { sendEmail } from "./sendEmail.api"
import { IntegrationEngine } from "@/src/components/work-flow/apiIntegrations/types/integration.types"

export const mailEngine: IntegrationEngine = {
  // We only run this on final workflow execution, 
  // currently we return the payload that the orchestrator will use to actually send the email.
  // In a true live system, the backend handles execution, 
  // but for testing or manual triggers, this is useful.
  onSetup: async (eventData) => {
    // Left empty or can be used if mail integration 
    // needs to register something on the backend during pipeline publish
  },
}
