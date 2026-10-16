import type { WorkflowNode } from "@prisma/client";
import { CreateNodeDTO, UpdateNodeDTO } from "./node.dto.js";
import { workflowNodeRepository, type UpdateWorkflowNodeInput } from "./node.repository.js";
import { workflowRepository } from "../workflow/workflow.repository.js";
import { createMappingsBulkService } from "../field_mapping/mapping.service.js";
import { createPollingSubscription } from "../../polling-engine/polling.service.js";
import { getDefaultPollInterval } from "../../polling-engine/polling.runner.js";

// Integrations that use the polling engine directly at node-creation time.
// Leadshub and ServiceM8 are subscribed through the hybrid subscription
// endpoint during publish/test so webhook-capable triggers do not get a stale
// polling subscription in the background.
const POLLING_INTEGRATIONS = new Set(["commusoft", "simpro"]);

export async function createNodeService(
  workflowId: string,
  payload: CreateNodeDTO
) {
  console.log(`[NodeService] Creating node | workflow_id=${workflowId} type=${payload.type} integration=${payload.integration_key}`);

  const node = await workflowNodeRepository.create({
    workflow_id: workflowId,
    integration_key: payload.integration_key,
    type: payload.type,
    node_category: payload.node_category ?? payload.type,
    config: payload.config || {},
    sample_payload: payload.sample_payload || {},
    output_schema: payload.output_schema || {},
    position: payload.position || 0,
    action_key: payload.action_key ?? "",
  });

  console.log(`[NodeService] Node created successfully | node_id=${node.id}`);

  if (
    payload.type === "trigger" &&
    POLLING_INTEGRATIONS.has(payload.integration_key) &&
    payload.action_key
  ) {
    await autoCreatePollingSubscription(workflowId, node, payload.action_key);
  }

  return node;
}

/** Polling trigger nodes get their subscription immediately so the engine starts watching. */
async function autoCreatePollingSubscription(workflowId: string, node: WorkflowNode, eventKey: string) {
  try {
    const workflow = await workflowRepository.findById(workflowId);
    if (!workflow) {
      console.warn(`[NodeService] ⚠ Could not auto-create subscription — workflow ${workflowId} not found`);
      return;
    }

    const subscription = await createPollingSubscription({
      workflow_id: workflowId,
      node_id: node.id,
      user_id: workflow.user_id,
      integration_key: node.integration_key,
      event_key: eventKey,
      config: (node.config ?? {}) as Record<string, any>,
      poll_interval: getDefaultPollInterval(),
    });
    console.log(
      `[NodeService] ✅ Polling subscription auto-created | sub_id=${subscription.id} event=${eventKey} integration=${node.integration_key}`
    );
  } catch (error: any) {
    // Non-fatal — node was created, subscription can be created manually
    console.error(`[NodeService] ⚠ Failed to auto-create polling subscription | node_id=${node.id} error=${error?.message}`);
  }
}

/** Only real workflow_nodes columns are written; anything else in the payload is ignored. */
function buildNodePatch(updates: Omit<UpdateNodeDTO, "mappings">): UpdateWorkflowNodeInput {
  const patch: UpdateWorkflowNodeInput = {};
  if (updates.integration_key !== undefined) patch.integration_key = updates.integration_key;
  if (updates.node_category !== undefined) patch.node_category = updates.node_category;
  if (updates.config !== undefined) patch.config = updates.config;
  if (updates.sample_payload !== undefined) patch.sample_payload = updates.sample_payload;
  if (updates.output_schema !== undefined) patch.output_schema = updates.output_schema;
  if (updates.position !== undefined) patch.position = updates.position;
  if (updates.action_key !== undefined) patch.action_key = updates.action_key;
  return patch;
}

export async function updateNodeService(
  nodeId: string,
  updates: UpdateNodeDTO
) {
  // Split mappings off so they don't get written into workflow_nodes —
  // workflow_field_mappings is a separate table with its own validator.
  const { mappings, ...nodeUpdates } = updates;

  console.log(
    `[NodeService] Updating node | node_id=${nodeId}`,
    Object.keys(nodeUpdates),
    mappings ? `+mappings(${mappings.length})` : ""
  );

  const node = await workflowNodeRepository.update(nodeId, buildNodePatch(nodeUpdates));

  // When mappings are provided, rewrite workflow_field_mappings in the same
  // request so config/sample_payload and mappings cannot drift apart. This
  // closes the window where the UI forgets to call /mappings/bulk after a
  // template edit, which previously caused stale source_field at execution.
  if (Array.isArray(mappings)) {
    if (mappings.length === 0) {
      console.warn(
        `[NodeService] mappings=[] received for node ${nodeId} — leaving existing mappings untouched. ` +
        `Use DELETE /nodes/:id/mappings/:destinationField to remove individual rows.`
      );
    } else {
      await createMappingsBulkService(nodeId, mappings);
      console.log(`[NodeService] Mappings re-synced atomically | node_id=${nodeId} count=${mappings.length}`);
    }
  }

  console.log(`[NodeService] Node updated | node_id=${nodeId}`);
  return node;
}

/**
 * saveSamplePayloadService
 *
 * Called when a test webhook fires — stores the raw incoming payload on the trigger
 * node so it can be used as a schema reference when the user builds field mappings.
 *
 * output_schema is derived as a flat key→null map so the UI can list available
 * source fields without exposing real data.
 */
export async function saveSamplePayloadService(
  nodeId: string,
  samplePayload: Record<string, any>
) {
  const outputSchema = Object.keys(samplePayload).reduce<Record<string, null>>(
    (schema, key) => ({ ...schema, [key]: null }),
    {}
  );

  console.log(`[NodeService] Saving sample_payload for trigger node | node_id=${nodeId}`);
  console.log(`[NodeService] sample_payload keys:`, Object.keys(samplePayload));

  const node = await workflowNodeRepository.update(nodeId, {
    sample_payload: samplePayload,
    output_schema: outputSchema,
  });

  console.log(`[NodeService] sample_payload saved | node_id=${nodeId} | keys_count=${Object.keys(samplePayload).length}`);
  return node;
}

/** The webhook trigger node configured with the given dynamic webhook id, or null. */
export function findWebhookTriggerNodeService(webhookId: string) {
  return workflowNodeRepository.findWebhookTriggerNode(webhookId);
}

export function getNodesByWorkflowService(workflowId: string) {
  return workflowNodeRepository.findByWorkflow(workflowId);
}

export async function deleteNodeService(nodeId: string) {
  await workflowNodeRepository.delete(nodeId);
  return { message: "Node deleted successfully" };
}
