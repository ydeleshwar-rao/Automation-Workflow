// template.service.ts

import { randomUUID } from "crypto";
import type { Prisma, WorkflowFieldMapping, WorkflowNode, WorkflowTemplateMapping, WorkflowTemplateNode } from "@prisma/client";
import {
  ApplyTemplateDTO,
  CreateTemplateFromWorkflowDTO,
  ListTemplatesQuery,
  UpdateTemplateDTO,
} from "./template.dto.js";
import {
  workflowTemplateRepository,
  type NewTemplateMapping,
  type NewTemplateNode,
  type NewWorkflowFieldMapping,
  type NewWorkflowNode,
  type TemplateListFilter,
  type UpdateTemplateInput,
} from "./template.repository.js";
import { asJsonArray, asJsonObject } from "../shared/json-object.js";
import { ApiError } from "../../../utils/ApiError.js";

const ACTIVE_STATUS = "active";
const DRAFT_STATUS = "draft";

// ---------- credential stripping ----------

// Keys whose presence in a node `config` indicates a client-owned credential.
// On template creation these are removed from config_schema and recorded in
// required_credentials so the apply step knows what to prompt for.
const CREDENTIAL_KEYS = [
  "smtp_id",
  "webhook_id",
  "credential_id",
  "connection_id",
  "auth_id",
];

const SECRET_KEY_PATTERNS = [/_token$/i, /_secret$/i, /_key$/i, /password/i];

function isCredentialKey(key: string): boolean {
  if (CREDENTIAL_KEYS.includes(key)) return true;
  return SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function stripCredentials(config: Record<string, any>): {
  config_schema: Record<string, any>;
  required_credentials: Array<{ type: string; field: string }>;
} {
  const requiredCredentials: Array<{ type: string; field: string }> = [];
  const cleanConfig: Record<string, any> = {};

  for (const [key, value] of Object.entries(config)) {
    if (isCredentialKey(key)) {
      requiredCredentials.push({ type: key.replace(/_id$/, ""), field: key });
    } else {
      cleanConfig[key] = value;
    }
  }

  return { config_schema: cleanConfig, required_credentials: requiredCredentials };
}

function toInputJson(value: Prisma.JsonValue | null, fallback: Prisma.InputJsonValue = {}): Prisma.InputJsonValue {
  return (value ?? fallback) as Prisma.InputJsonValue;
}

// ---------- create template from an existing workflow ----------

function buildTemplateNodes(sourceNodes: WorkflowNode[], nodeIdMap: Record<string, string>): NewTemplateNode[] {
  return sourceNodes.map((node) => {
    const { config_schema, required_credentials } = stripCredentials(asJsonObject(node.config));
    const templateNodeId = randomUUID();
    nodeIdMap[node.id] = templateNodeId;
    return {
      id: templateNodeId,
      type: node.type,
      node_category: node.node_category ?? node.type,
      integration_key: node.integration_key,
      action_key: node.action_key ?? null,
      config_schema,
      required_credentials,
      output_schema: toInputJson(node.output_schema),
      position: node.position,
    };
  });
}

/** Rewrites source_node_id → source_template_node_id so mappings point at the template's nodes. */
function buildTemplateMappings(
  sourceMappings: WorkflowFieldMapping[],
  nodeIdMap: Record<string, string>
): NewTemplateMapping[] {
  return sourceMappings.flatMap((row) => {
    const templateNodeId = nodeIdMap[row.workflow_node_id];
    if (!templateNodeId) return [];

    const rewritten = asJsonArray(row.mappings).map((mapping) => ({
      mapping_type: mapping.mapping_type,
      destination_field: mapping.destination_field,
      source_template_node_id: mapping.source_node_id ? nodeIdMap[mapping.source_node_id] ?? null : null,
      source_field: mapping.source_field ?? null,
      static_value: mapping.static_value ?? null,
      transformation: mapping.transformation ?? null,
    }));

    return [{ template_node_id: templateNodeId, mappings: rewritten }];
  });
}

export async function createTemplateFromWorkflowService(
  payload: CreateTemplateFromWorkflowDTO
) {
  console.log(
    `[TemplateService] Creating template from workflow | source=${payload.source_workflow_id} name=${payload.name}`
  );

  const sourceWorkflow = await workflowTemplateRepository.findSourceWorkflow(payload.source_workflow_id);
  if (!sourceWorkflow) throw new ApiError(404, "Source workflow not found");

  const sourceNodes = await workflowTemplateRepository.findWorkflowNodes(payload.source_workflow_id);
  if (sourceNodes.length === 0) {
    throw new ApiError(400, "Source workflow has no nodes to template");
  }

  const sourceMappings = await workflowTemplateRepository.findFieldMappings(sourceNodes.map((node) => node.id));

  const nodeIdMap: Record<string, string> = {};
  const templateNodes = buildTemplateNodes(sourceNodes, nodeIdMap);
  const templateMappings = buildTemplateMappings(sourceMappings, nodeIdMap);

  const { template, nodes } = await workflowTemplateRepository.createWithParts(
    {
      name: payload.name,
      description: payload.description ?? null,
      category: payload.category ?? null,
      tag: payload.tag ?? sourceWorkflow.tag ?? null,
      source_workflow_id: payload.source_workflow_id,
      created_by: payload.created_by,
      is_public: payload.is_public ?? false,
      status: ACTIVE_STATUS,
    },
    templateNodes,
    templateMappings
  );

  console.log(`[TemplateService] Template created | id=${template.id} nodes=${nodes.length}`);
  return { ...template, nodes };
}

// ---------- list ----------

export function listTemplatesService(filters: ListTemplatesQuery) {
  const where: TemplateListFilter = {};
  if (filters.created_by) where.created_by = filters.created_by;
  if (filters.category) where.category = filters.category;
  if (filters.status) where.status = filters.status;
  if (filters.template_folder_id) where.template_folder_id = filters.template_folder_id;
  if (filters.is_public !== undefined) {
    where.is_public = typeof filters.is_public === "string" ? filters.is_public === "true" : filters.is_public;
  }

  return workflowTemplateRepository.findMany(where);
}

// ---------- get by id (full detail) ----------

export async function getTemplateByIdService(id: string) {
  const template = await workflowTemplateRepository.findByIdWithParts(id);
  if (!template) throw new ApiError(404, "Template not found");
  return template;
}

// ---------- update (name, description, status, etc.) ----------

export function updateTemplateService(id: string, payload: UpdateTemplateDTO) {
  const updates: UpdateTemplateInput = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.category !== undefined) updates.category = payload.category;
  if (payload.tag !== undefined) updates.tag = payload.tag;
  if (payload.is_public !== undefined) updates.is_public = payload.is_public;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.template_folder_id !== undefined) updates.template_folder_id = payload.template_folder_id;

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No fields to update");
  }

  return workflowTemplateRepository.update(id, updates);
}

// ---------- delete ----------

export async function deleteTemplateService(id: string) {
  await workflowTemplateRepository.delete(id);
  return { message: "Template deleted successfully" };
}

// ---------- apply template -> create new workflow ----------

function buildWorkflowNodes(
  templateNodes: WorkflowTemplateNode[],
  credentialOverrides: Record<string, Record<string, any>>,
  nodeIdMap: Record<string, string>
): NewWorkflowNode[] {
  return templateNodes.map((templateNode) => {
    const nodeId = randomUUID();
    nodeIdMap[templateNode.id] = nodeId;
    return {
      id: nodeId,
      integration_key: templateNode.integration_key,
      type: templateNode.type,
      node_category: templateNode.node_category ?? templateNode.type,
      action_key: templateNode.action_key ?? "",
      config: { ...asJsonObject(templateNode.config_schema), ...(credentialOverrides[templateNode.id] ?? {}) },
      sample_payload: {},
      output_schema: toInputJson(templateNode.output_schema),
      position: templateNode.position,
    };
  });
}

/** Rewrites source_template_node_id → source_node_id so mappings point at the new workflow's nodes. */
function buildWorkflowMappings(
  templateMappings: WorkflowTemplateMapping[],
  nodeIdMap: Record<string, string>
): NewWorkflowFieldMapping[] {
  return templateMappings.flatMap((row) => {
    const nodeId = nodeIdMap[row.template_node_id];
    if (!nodeId) return [];

    const rewritten = asJsonArray(row.mappings).map((mapping) => ({
      mapping_type: mapping.mapping_type,
      destination_field: mapping.destination_field,
      source_node_id: mapping.source_template_node_id ? nodeIdMap[mapping.source_template_node_id] ?? null : null,
      source_field: mapping.source_field ?? null,
      static_value: mapping.static_value ?? null,
      transformation: mapping.transformation ?? null,
    }));

    return [{ workflow_node_id: nodeId, mappings: rewritten }];
  });
}

export async function applyTemplateService(templateId: string, payload: ApplyTemplateDTO) {
  console.log(`[TemplateService] Applying template | template=${templateId} user=${payload.user_id}`);

  const template = await workflowTemplateRepository.findByIdWithParts(templateId);
  if (!template) throw new ApiError(404, "Template not found");
  if (template.status !== ACTIVE_STATUS) throw new ApiError(400, "Template is not active");
  if (template.nodes.length === 0) throw new ApiError(400, "Template has no nodes");

  const nodeIdMap: Record<string, string> = {};
  const workflowNodes = buildWorkflowNodes(template.nodes, payload.credential_overrides ?? {}, nodeIdMap);
  const workflowMappings = buildWorkflowMappings(template.mappings, nodeIdMap);

  const workflow = await workflowTemplateRepository.createWorkflowFromTemplate(
    templateId,
    {
      name: payload.name,
      tag: payload.tag ?? template.tag ?? null,
      user_id: payload.user_id,
      status: DRAFT_STATUS,
    },
    workflowNodes,
    workflowMappings
  );

  console.log(`[TemplateService] Applied | template=${templateId} workflow=${workflow.id}`);
  return { workflow, nodes_created: workflowNodes.length };
}
