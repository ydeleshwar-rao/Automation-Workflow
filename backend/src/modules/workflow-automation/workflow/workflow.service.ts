// workflow.service.ts

import type { Workflow } from "@prisma/client";
import {
  CreateWorkflowDTO,
  UpdateWorkflowDTO,
  BulkMoveWorkflowsDTO,
  ReorderWorkflowsDTO,
} from "./workflow.dto.js";
import { workflowRepository, type UpdateWorkflowInput } from "./workflow.repository.js";
import { ApiError } from "../../../utils/ApiError.js";
import { workflowLogger as log } from "../../../utils/logger.js";

const DRAFT_STATUS = "draft";
const ACTIVE_STATUS = "active";
const PAUSED_STATUS = "paused";

export async function createWorkflowService(payload: CreateWorkflowDTO) {
  const workflow = await workflowRepository.create({
    name: payload.name,
    tag: payload.tag || null,
    user_id: payload.user_id,
    status: DRAFT_STATUS,
    folder_id: payload.folder_id ?? null,
    ...(typeof payload.position === "number" ? { position: payload.position } : {}),
  });

  log.info("workflow created", {
    workflowId: workflow.id,
    name: workflow.name,
    userId: workflow.user_id,
    status: workflow.status,
  });
  return workflow;
}

export async function getWorkflowByIdService(id: string) {
  const workflow = await workflowRepository.findById(id);
  if (!workflow) throw new ApiError(404, "Workflow not found");
  return workflow;
}

export async function getWorkflowsService(userId: string) {
  const workflows = await workflowRepository.findByOwner(userId);
  return enrichWithOwnerNames(workflows);
}

async function enrichWithOwnerNames(workflows: Workflow[]) {
  const ownerIds = [...new Set(workflows.map((workflow) => workflow.user_id))];
  if (!ownerIds.length) return workflows;

  const profiles = await workflowRepository.findProfileNames(ownerIds);
  const ownerNameById = new Map(profiles.map((profile) => [profile.id, profile.full_name || null]));

  return workflows.map((workflow) => ({
    ...workflow,
    owner_name: ownerNameById.get(workflow.user_id) ?? null,
  }));
}

/** Best-effort display name of the editor; null when the profile has no name. */
export async function getEditorNameService(userId: string): Promise<string | null> {
  const profile = await workflowRepository.findProfileName(userId);
  return profile?.full_name || null;
}

function buildWorkflowPatch(payload: UpdateWorkflowDTO): UpdateWorkflowInput {
  const patch: UpdateWorkflowInput = {};
  if (typeof payload.name === "string") patch.name = payload.name;
  if (typeof payload.tag === "string") patch.tag = payload.tag;
  if (typeof payload.status === "string") patch.status = payload.status;
  if (payload.folder_id !== undefined) patch.folder_id = payload.folder_id;
  if (typeof payload.position === "number") patch.position = payload.position;
  if (payload.last_edited_by) {
    patch.last_edited_by_user_id = payload.last_edited_by;
    patch.last_edited_at = new Date();
  }
  if (payload.last_edited_by_name) patch.last_edited_by_name = payload.last_edited_by_name;
  return patch;
}

export async function updateWorkflowService(id: string, payload: UpdateWorkflowDTO) {
  const patch = buildWorkflowPatch(payload);
  const isStatusToggle = payload.status === ACTIVE_STATUS || payload.status === PAUSED_STATUS;

  const workflow = isStatusToggle
    ? await workflowRepository.updateWithPollingState(id, patch, payload.status === ACTIVE_STATUS)
    : await workflowRepository.update(id, patch);

  log.info("workflow updated", {
    workflowId: id,
    fields: Object.keys(patch).filter((field) => field !== "last_edited_at"),
    status: payload.status ?? undefined,
  });
  if (isStatusToggle) {
    log.info(`workflow status → ${payload.status}, polling subscriptions updated`, { workflowId: id });
  }

  return workflow;
}

export async function deleteWorkflowService(id: string) {
  await workflowRepository.delete(id);
  log.info("workflow deleted", { workflowId: id });
  return { message: "Workflow deleted successfully" };
}

export async function activateWorkflowService(id: string) {
  const workflow = await workflowRepository.updateWithPollingState(id, { status: ACTIVE_STATUS }, true);
  log.info("workflow activated", { workflowId: id });
  return workflow;
}

export async function bulkMoveWorkflowsService(payload: BulkMoveWorkflowsDTO) {
  if (!payload.ids.length) return { message: "No workflows to move" };

  await workflowRepository.moveToFolder(payload.ids, payload.folder_id);
  log.info("workflows bulk moved", { ids: payload.ids, folderId: payload.folder_id });
  return { message: "Workflows moved successfully" };
}

export async function reorderWorkflowsService(payload: ReorderWorkflowsDTO) {
  await workflowRepository.reorder(payload.items);
  log.info("workflows reordered", { count: payload.items.length });
  return { message: "Workflows reordered successfully" };
}
