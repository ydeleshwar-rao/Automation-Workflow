import {
  CreateFolderDTO,
  UpdateFolderDTO,
  ReorderFoldersDTO,
} from "./folder.dto.js";
import { workflowFolderRepository, type UpdateWorkflowFolderInput } from "./folder.repository.js";
import { ApiError } from "../../../../utils/ApiError.js";

const ADMIN_ROLE = "admin";

export function createFolderService(payload: CreateFolderDTO) {
  return workflowFolderRepository.create({
    name: payload.name,
    user_id: payload.user_id,
    parent_id: payload.parent_id ?? null,
    ...(typeof payload.position === "number" ? { position: payload.position } : {}),
  });
}

/** Admins see every folder; everyone else sees only their own. */
export function getFoldersByUserService(userId: string, role?: string) {
  const ownerUserId = role === ADMIN_ROLE ? undefined : userId;
  return workflowFolderRepository.findMany(ownerUserId);
}

export async function updateFolderService(id: string, payload: UpdateFolderDTO) {
  const patch: UpdateWorkflowFolderInput = {};
  if (typeof payload.name === "string") patch.name = payload.name;
  if (payload.parent_id !== undefined) patch.parent_id = payload.parent_id;
  if (typeof payload.position === "number") patch.position = payload.position;

  if (payload.parent_id !== undefined && payload.parent_id !== null) {
    await assertValidParent(id, payload.parent_id);
  }

  return workflowFolderRepository.update(id, patch);
}

export async function deleteFolderService(id: string) {
  await workflowFolderRepository.delete(id);
  return { message: "Folder deleted successfully" };
}

export async function reorderFoldersService(payload: ReorderFoldersDTO) {
  await workflowFolderRepository.reorder(payload.items);
  return { message: "Folders reordered successfully" };
}

async function assertValidParent(folderId: string, parentId: string): Promise<void> {
  if (parentId === folderId) {
    throw new ApiError(400, "A folder cannot be its own parent");
  }
  const descendantIds = await collectDescendantIds(folderId);
  if (descendantIds.has(parentId)) {
    throw new ApiError(400, "Cannot move a folder into one of its own descendants");
  }
}

async function collectDescendantIds(rootId: string): Promise<Set<string>> {
  const descendants = new Set<string>();
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const childIds = await workflowFolderRepository.findChildIds(currentId);
    for (const childId of childIds) {
      if (!descendants.has(childId)) {
        descendants.add(childId);
        queue.push(childId);
      }
    }
  }
  return descendants;
}
