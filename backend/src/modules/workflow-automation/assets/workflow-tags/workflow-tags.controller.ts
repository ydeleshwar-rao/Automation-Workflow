import type { Request, Response, NextFunction } from "express";
import {
  createTagService,
  getTagsService,
  updateTagService,
  deleteTagService,
  getTagSettingsService,
  updateTagSettingsService,
  addTagToWorkflowService,
  removeTagFromWorkflowService,
  getTagsByWorkflowService,
  getWorkflowsByTagService,
} from "./workflow-tags.service.js";
import type { CreateWorkflowTagDTO, UpdateWorkflowTagDTO } from "./workflow-tags.dto.js";
import { validateId } from "../../../../utils/CustomFunc.js";
import { ApiResponse } from "../../../../utils/ApiResponse.js";
import { ApiError } from "../../../../utils/ApiError.js";

const MAX_TAG_NAME_LENGTH = 40;
const MAX_TAG_COLOR_LENGTH = 32;

/** authMiddleware runs on every tag route, so the signed-in user is always present. */
function getSignedInUser(req: Request) {
  if (!req.user) throw new ApiError(401, "Not signed in");
  return req.user;
}

function parseTagName(rawName: unknown): string {
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name || name.length > MAX_TAG_NAME_LENGTH) {
    throw new ApiError(400, `Tag name is required (max ${MAX_TAG_NAME_LENGTH} characters)`);
  }
  return name;
}

function parseTagColor(rawColor: unknown): string | null {
  if (rawColor === undefined || rawColor === null || rawColor === "") return null;
  if (typeof rawColor !== "string" || rawColor.length > MAX_TAG_COLOR_LENGTH) {
    throw new ApiError(400, "Tag color must be a short string such as #3b82f6");
  }
  return rawColor;
}

function parseCreateTagBody(body: Record<string, unknown>): CreateWorkflowTagDTO {
  return { name: parseTagName(body.name), color: parseTagColor(body.color) };
}

function parseUpdateTagBody(body: Record<string, unknown>): UpdateWorkflowTagDTO {
  return {
    ...(body.name !== undefined ? { name: parseTagName(body.name) } : {}),
    ...(body.color !== undefined ? { color: parseTagColor(body.color) } : {}),
  };
}

// ─── Settings ───

export async function getTagSettingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getTagSettingsService(getSignedInUser(req).organizationId);
    return ApiResponse(res, 200, "Tag settings retrieved", result);
  } catch (error) {
    next(error);
  }
}

export async function updateTagSettingsController(req: Request, res: Response, next: NextFunction) {
  try {
    const { enabled } = req.body ?? {};
    if (typeof enabled !== "boolean") throw new ApiError(400, "enabled must be true or false");
    const result = await updateTagSettingsService(getSignedInUser(req).organizationId, enabled);
    return ApiResponse(res, 200, "Tag settings updated", result);
  } catch (error) {
    next(error);
  }
}

// ─── Tag CRUD ───

export async function createTagController(req: Request, res: Response, next: NextFunction) {
  try {
    const user = getSignedInUser(req);
    const result = await createTagService(user.organizationId, user.id, parseCreateTagBody(req.body ?? {}));
    return ApiResponse(res, 201, "Tag created successfully", result);
  } catch (error) {
    next(error);
  }
}

export async function getTagsController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getTagsService(getSignedInUser(req).organizationId);
    return ApiResponse(res, 200, "Tags retrieved successfully", result);
  } catch (error) {
    next(error);
  }
}

export async function updateTagController(req: Request, res: Response, next: NextFunction) {
  try {
    const tagId = req.params.id;
    validateId(tagId);
    const result = await updateTagService(getSignedInUser(req).organizationId, tagId, parseUpdateTagBody(req.body ?? {}));
    return ApiResponse(res, 200, "Tag updated successfully", result);
  } catch (error) {
    next(error);
  }
}

export async function deleteTagController(req: Request, res: Response, next: NextFunction) {
  try {
    const tagId = req.params.id;
    validateId(tagId);
    const result = await deleteTagService(getSignedInUser(req).organizationId, tagId);
    return ApiResponse(res, 200, "Tag deleted successfully", result);
  } catch (error) {
    next(error);
  }
}

// ─── Workflow ↔ Tag linking ───

export async function addTagToWorkflowController(req: Request, res: Response, next: NextFunction) {
  try {
    const workflowId = req.params.workflowId;
    const { tag_id } = req.body ?? {};
    validateId(workflowId);
    validateId(tag_id);
    const result = await addTagToWorkflowService(getSignedInUser(req).organizationId, workflowId, tag_id);
    return ApiResponse(res, 201, "Tag added to workflow", result);
  } catch (error) {
    next(error);
  }
}

export async function removeTagFromWorkflowController(req: Request, res: Response, next: NextFunction) {
  try {
    const { workflowId, tagId } = req.params;
    validateId(workflowId);
    validateId(tagId);
    const result = await removeTagFromWorkflowService(workflowId, tagId);
    return ApiResponse(res, 200, "Tag removed from workflow", result);
  } catch (error) {
    next(error);
  }
}

export async function getTagsByWorkflowController(req: Request, res: Response, next: NextFunction) {
  try {
    const workflowId = req.params.workflowId;
    validateId(workflowId);
    const result = await getTagsByWorkflowService(workflowId);
    return ApiResponse(res, 200, "Tags retrieved successfully", result);
  } catch (error) {
    next(error);
  }
}

export async function getWorkflowsByTagController(req: Request, res: Response, next: NextFunction) {
  try {
    const tagId = req.params.tagId;
    validateId(tagId);
    const result = await getWorkflowsByTagService(tagId);
    return ApiResponse(res, 200, "Workflows retrieved successfully", result);
  } catch (error) {
    next(error);
  }
}
