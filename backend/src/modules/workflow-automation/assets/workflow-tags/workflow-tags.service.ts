import type { WorkflowTag } from "@prisma/client";
import { ApiError } from "../../../../utils/ApiError.js";
import { workflowLogger as log } from "../../../../utils/logger.js";
import type { CreateWorkflowTagDTO, UpdateWorkflowTagDTO, WorkflowTagSettingsDTO } from "./workflow-tags.dto.js";
import { workflowTagRepository } from "./workflow-tags.repository.js";

/** Tags are shared by everyone in an organization; only its admins manage them. */

async function findTagOrThrow(tagId: string, organizationId: string): Promise<WorkflowTag> {
  const tag = await workflowTagRepository.findInOrganization(tagId, organizationId);
  if (!tag) throw new ApiError(404, "Tag not found");
  return tag;
}

async function assertNameIsFree(name: string, organizationId: string, ownTagId?: string) {
  const existingTag = await workflowTagRepository.findByNameInOrganization(name, organizationId);
  if (existingTag && existingTag.id !== ownTagId) {
    throw new ApiError(409, `A tag named "${existingTag.name}" already exists`);
  }
}

// ─── Settings ───

export async function getTagSettingsService(organizationId: string): Promise<WorkflowTagSettingsDTO> {
  return { enabled: await workflowTagRepository.isTaggingEnabled(organizationId) };
}

export async function updateTagSettingsService(organizationId: string, isEnabled: boolean): Promise<WorkflowTagSettingsDTO> {
  const enabled = await workflowTagRepository.setTaggingEnabled(organizationId, isEnabled);
  log.info("workflow tags toggled", { organizationId, enabled });
  return { enabled };
}

// ─── Tag CRUD ───

export function getTagsService(organizationId: string) {
  return workflowTagRepository.findManyForOrganization(organizationId);
}

export async function createTagService(organizationId: string, userId: string, payload: CreateWorkflowTagDTO) {
  await assertNameIsFree(payload.name, organizationId);
  return workflowTagRepository.create({
    organization_id: organizationId,
    user_id: userId,
    name: payload.name,
    color: payload.color,
  });
}

export async function updateTagService(organizationId: string, tagId: string, payload: UpdateWorkflowTagDTO) {
  await findTagOrThrow(tagId, organizationId);
  if (payload.name !== undefined) await assertNameIsFree(payload.name, organizationId, tagId);
  return workflowTagRepository.update(tagId, payload);
}

export async function deleteTagService(organizationId: string, tagId: string) {
  await findTagOrThrow(tagId, organizationId);
  await workflowTagRepository.delete(tagId);
  return { message: "Tag deleted successfully" };
}

// ─── Workflow ↔ Tag linking ───

export async function addTagToWorkflowService(organizationId: string, workflowId: string, tagId: string) {
  if (!(await workflowTagRepository.isTaggingEnabled(organizationId))) {
    throw new ApiError(403, "Workflow tags are turned off by your admin");
  }
  await findTagOrThrow(tagId, organizationId);
  return workflowTagRepository.linkToWorkflow(workflowId, tagId);
}

/** Removing is allowed even while tags are off, so workflows can always be cleaned up. */
export async function removeTagFromWorkflowService(workflowId: string, tagId: string) {
  await workflowTagRepository.unlinkFromWorkflow(workflowId, tagId);
  return { message: "Tag removed from workflow" };
}

/** Response keeps the original API shape: [{ tag_id, workflow_tags: {...} }]. */
export async function getTagsByWorkflowService(workflowId: string) {
  const tagLinks = await workflowTagRepository.findTagsForWorkflow(workflowId);
  return tagLinks.map((tagLink) => ({ tag_id: tagLink.tag_id, workflow_tags: tagLink.tag }));
}

/** Response keeps the original API shape: [{ workflow_id, workflows: {...} }]. */
export async function getWorkflowsByTagService(tagId: string) {
  const tagLinks = await workflowTagRepository.findWorkflowsForTag(tagId);
  return tagLinks.map((tagLink) => ({ workflow_id: tagLink.workflow_id, workflows: tagLink.workflow }));
}
