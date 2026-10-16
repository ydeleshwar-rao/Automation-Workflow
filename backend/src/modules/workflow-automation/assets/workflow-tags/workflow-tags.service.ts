import { CreateWorkflowTagDTO, UpdateWorkflowTagDTO } from "./workflow-tags.dto.js";
import { workflowTagRepository } from "./workflow-tags.repository.js";

const ADMIN_ROLE = "admin";

// ─── Tag CRUD ───

export function createTagService(payload: CreateWorkflowTagDTO) {
  return workflowTagRepository.create({
    name: payload.name,
    color: payload.color || null,
    user_id: payload.user_id,
  });
}

/** Admins see every tag; everyone else sees only their own. */
export function getTagsByUserService(userId: string, role?: string) {
  const ownerUserId = role === ADMIN_ROLE ? undefined : userId;
  return workflowTagRepository.findMany(ownerUserId);
}

export function updateTagService(tagId: string, payload: UpdateWorkflowTagDTO) {
  return workflowTagRepository.update(tagId, payload);
}

export async function deleteTagService(tagId: string) {
  await workflowTagRepository.delete(tagId);
  return { message: "Tag deleted successfully" };
}

// ─── Workflow ↔ Tag linking ───

export function addTagToWorkflowService(workflowId: string, tagId: string) {
  return workflowTagRepository.linkToWorkflow(workflowId, tagId);
}

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
