import { executeWorkflow } from "../processor/webhookProcessor.js";
import { workflowExecutionRepository } from "./execution.repository.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function triggerWorkflowExecutionService(
  workflowId: string,
  clientId: string,
  triggerData: Record<string, any>
) {
  // Start execution async — does not block the HTTP response
  executeWorkflow(workflowId, triggerData).catch(console.error);
  return { workflow_id: workflowId, status: "started" };
}

export function getExecutionsByWorkflowService(workflowId: string) {
  return workflowExecutionRepository.findByWorkflow(workflowId);
}

export async function getExecutionByIdService(executionId: string) {
  const execution = await workflowExecutionRepository.findById(executionId);
  if (!execution) throw new ApiError(404, "Execution not found");
  return execution;
}
