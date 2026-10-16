// template-folder.service.ts

import { applyTemplateService } from "../template.service.js";
import { workflowTemplateRepository } from "../template.repository.js";
import { templateFolderRepository, type UpdateTemplateFolderInput } from "./template-folder.repository.js";
import { integrationConnectionRepository } from "./integration-connection.repository.js";
import { ApiError } from "../../../../utils/ApiError.js";
import type {
  BulkApplyFolderDTO,
  CreateTemplateFolderDTO,
  ListTemplateFoldersQuery,
  UpdateTemplateFolderDTO,
} from "./template-folder.dto.js";

// ─── Integration status ───────────────────────────────────────────────────────

export interface IntegrationStatusItem {
  connected: boolean;
  needs_reauth?: boolean;
}
export type IntegrationStatusMap = Record<string, IntegrationStatusItem>;

async function getIntegrationStatus(integrationKey: string, userId: string): Promise<IntegrationStatusItem> {
  try {
    const connection = await integrationConnectionRepository.findConnection(integrationKey, userId);
    if (!connection) return { connected: false };
    return { connected: !connection.needs_reauth, needs_reauth: connection.needs_reauth };
  } catch (error: any) {
    // One failing lookup must not hide the status of the other integrations.
    console.error(`[IntegrationStatus] lookup failed key="${integrationKey}":`, error?.message ?? error);
    return { connected: false };
  }
}

/**
 * Returns which of the known integrations a given user has connected.
 * Only the integrations that are relevant to the provided list (or all if empty) are checked.
 */
export async function getUserIntegrationStatusService(
  userId: string,
  integrationKeys?: string[]
): Promise<IntegrationStatusMap> {
  const keysToCheck = integrationKeys?.length
    ? integrationKeys.filter((key) => integrationConnectionRepository.isSupported(key))
    : integrationConnectionRepository.supportedIntegrationKeys();

  const statuses = await Promise.all(
    keysToCheck.map(async (key) => [key, await getIntegrationStatus(key, userId)] as const)
  );

  const result = Object.fromEntries(statuses);
  console.log(`[IntegrationStatus] final result for userId="${userId}":`, JSON.stringify(result));
  return result;
}

/** Developers may only look at clients assigned to them. */
export function isClientAssignedToDeveloperService(developerId: string, clientUserId: string) {
  return templateFolderRepository.isClientAssignedToDeveloper(developerId, clientUserId);
}

/**
 * Returns the unique integration_keys required by active templates in a folder.
 */
export async function getRequiredIntegrationsService(folderId: string): Promise<string[]> {
  const templates = await workflowTemplateRepository.findActiveInFolder(folderId);
  if (!templates.length) return [];

  const integrationKeys = await workflowTemplateRepository.findIntegrationKeys(
    templates.map((template) => template.id)
  );
  console.log(`[RequiredIntegrations] folderId=${folderId} | unique integration_keys found:`, integrationKeys);
  return integrationKeys;
}

export function createTemplateFolderService(payload: CreateTemplateFolderDTO) {
  return templateFolderRepository.create({
    name: payload.name,
    description: payload.description ?? null,
    parent_id: payload.parent_id ?? null,
    created_by: payload.created_by,
    is_public: payload.is_public ?? false,
  });
}

export function listTemplateFoldersService(query: ListTemplateFoldersQuery) {
  return templateFolderRepository.findMany(query.created_by);
}

export function updateTemplateFolderService(id: string, payload: UpdateTemplateFolderDTO) {
  const patch: UpdateTemplateFolderInput = {};
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.description !== undefined) patch.description = payload.description;
  if (payload.parent_id !== undefined) patch.parent_id = payload.parent_id;
  if (payload.is_public !== undefined) patch.is_public = payload.is_public;

  if (Object.keys(patch).length === 0) throw new ApiError(400, "No fields to update");

  return templateFolderRepository.update(id, patch);
}

export async function deleteTemplateFolderService(id: string) {
  // Subfolders and the templates' folder link are handled by the foreign keys.
  await templateFolderRepository.delete(id);
  return { message: "Folder deleted successfully" };
}

type BulkApplyResult = {
  template_id: string;
  template_name: string;
  workflow_id: string;
  workflow_name: string;
  status: "draft" | "active" | "disabled";
  error?: string;
};

export async function bulkApplyFolderService(folderId: string, payload: BulkApplyFolderDTO) {
  console.log(`[TemplateFolderService] Bulk apply | folder=${folderId} user=${payload.user_id}`);

  const folder = await templateFolderRepository.findById(folderId);
  if (!folder) throw new ApiError(404, "Folder not found");

  const templates = await workflowTemplateRepository.findActiveInFolder(folderId);
  if (templates.length === 0) {
    throw new ApiError(404, "No active templates found in this folder");
  }

  const results: BulkApplyResult[] = [];

  // Each template is applied on its own so one failure does not stop the rest.
  for (const template of templates) {
    try {
      const workflowName = payload.name_prefix
        ? `${payload.name_prefix} — ${template.name}`
        : template.name;

      const result = await applyTemplateService(template.id, {
        name: workflowName,
        user_id: payload.user_id,
        ...(template.tag ? { tag: template.tag } : {}),
      });

      results.push({
        template_id: template.id,
        template_name: template.name,
        workflow_id: result.workflow.id,
        workflow_name: result.workflow.name,
        status: result.workflow.status as BulkApplyResult["status"],
      });
    } catch (error: any) {
      results.push({
        template_id: template.id,
        template_name: template.name,
        workflow_id: "",
        workflow_name: "",
        status: "draft",
        error: error?.message ?? "Unknown error",
      });
    }
  }

  const succeeded = results.filter((result) => !result.error).length;
  const failed = results.length - succeeded;

  console.log(
    `[TemplateFolderService] Bulk apply done | folder=${folderId} succeeded=${succeeded} failed=${failed}`
  );

  return {
    folder_id: folderId,
    folder_name: folder.name,
    total: templates.length,
    succeeded,
    failed,
    results,
  };
}
