// ai-workflow.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Business-logic layer for the AI Visual Workflow builder.
// All persistence goes through ai-workflow.repository.ts.

import type { Prisma } from "@prisma/client";
import {
  CreateAiWorkflowDTO,
  UpdateAiWorkflowDTO,
  CreateExecutionDTO,
  UpdateExecutionDTO,
} from "./ai-workflow.dto.js";
import {
  aiWorkflowRepository,
  type UpdateAiExecutionInput,
  type UpdateAiWorkflowInput,
} from "./ai-workflow.repository.js";
import { ApiError } from "../../utils/ApiError.js";

const DEFAULT_WORKFLOW_NAME = "Untitled Workflow";
const DEFAULT_TRIGGER = "manual";

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

// ── Workflows ─────────────────────────────────────────────────────────────────

export function createAiWorkflowService(payload: CreateAiWorkflowDTO) {
  return aiWorkflowRepository.create({
    user_id: payload.user_id,
    name: payload.name ?? DEFAULT_WORKFLOW_NAME,
    description: payload.description ?? null,
    status: "draft",
  });
}

export function getAiWorkflowsService(userId: string) {
  return aiWorkflowRepository.findSummariesByOwner(userId);
}

export async function getAiWorkflowByIdService(id: string) {
  const workflow = await aiWorkflowRepository.findById(id);
  if (!workflow) throw new ApiError(404, "AI workflow not found");
  return workflow;
}

export function updateAiWorkflowService(id: string, patch: UpdateAiWorkflowDTO) {
  const updates: UpdateAiWorkflowInput = {};
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.nodes !== undefined) updates.nodes = toInputJson(patch.nodes);
  if (patch.edges !== undefined) updates.edges = toInputJson(patch.edges);
  if (patch.viewport !== undefined) updates.viewport = toInputJson(patch.viewport);

  return aiWorkflowRepository.update(id, updates);
}

export async function deleteAiWorkflowService(id: string) {
  await aiWorkflowRepository.delete(id);
  return { id };
}

// ── Executions ────────────────────────────────────────────────────────────────

export function createExecutionService(payload: CreateExecutionDTO) {
  return aiWorkflowRepository.createExecution(payload.workflow_id, payload.trigger ?? DEFAULT_TRIGGER);
}

export function getExecutionsService(workflowId: string) {
  return aiWorkflowRepository.findRecentExecutions(workflowId);
}

export function updateExecutionService(id: string, patch: UpdateExecutionDTO) {
  const updates: UpdateAiExecutionInput = {};
  if (patch.status) updates.status = patch.status;
  if (patch.node_results) updates.node_results = toInputJson(patch.node_results);
  if (patch.error) updates.error = patch.error;
  if (patch.finished_at) updates.finished_at = new Date(patch.finished_at);

  return aiWorkflowRepository.updateExecution(id, updates);
}
