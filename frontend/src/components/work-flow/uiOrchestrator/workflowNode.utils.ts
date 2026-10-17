/**
 * Pure helpers for workflow-builder nodes: defaults, backend ↔ canvas mapping,
 * config → saved payload conversion and field-mapping extraction.
 * No React and no network here, so every function is unit-testable.
 */

import type { CreateMappingPayload, WorkflowNodeRecord } from "../apiIntegrations/workflowApi";
import { getCachedWebhookData } from "../appEvents/webhook/apiIntegrations/webhook.engine";
import type { WorkflowNodeData } from "./types";

type NodeConfig = Record<string, unknown>;

export interface VariablePickerItem {
  id: string;
  label: string;
  description: string;
}

const TRIGGER_DESCRIPTION = "Select the event that starts your workflow";
const ACTION_DESCRIPTION = "Select the event for your zap to run";
const LOCAL_ACTION_ID_PREFIX = "action-";
const LETTERS_IN_ALPHABET = 26;
const LETTER_A_CHAR_CODE = 65;

/** {{map:sourceField|label|fallbackValue}} — a reference to a field of an earlier node. */
const MAP_TOKEN_PATTERN = /\{\{map:([^|]*)\|[^|]*\|([^}]*)\}\}/g;
const HAS_MAP_TOKEN_PATTERN = /\{\{map:[^|]*\|[^|]*\|[^}]*\}\}/;

/** Config keys that hold connection/test metadata rather than mappable field values. */
const INTERNAL_MAPPING_KEYS = new Set(["accountId", "accountName", "webhook_id", "webhook", "testPayload"]);

/** Integration keys the backend polling/webhook engine can auto-subscribe on publish. */
const AUTO_SUBSCRIBE_INTEGRATION_KEYS = new Set(["service_m8", "leadshub", "commusoft", "simpro"]);

/**
 * Nodes store the lower-cased app label ("servicem8") because the UI registry is looked
 * up by it, while the polling engine's adapter registry uses its own keys ("service_m8").
 */
const NODE_TO_ENGINE_INTEGRATION_KEY: Record<string, string> = { servicem8: "service_m8" };

function isPlainObject(value: unknown): value is NodeConfig {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ── Node factories ───────────────────────────────────────────────────────────

/** A client-side action placeholder; it gets a backend id once an app is chosen. */
export function createBlankActionNode(index: number): WorkflowNodeData {
  return {
    id: `${LOCAL_ACTION_ID_PREFIX}${Date.now()}`,
    type: "action",
    index,
    label: "Action",
    description: ACTION_DESCRIPTION,
  };
}

/** The blank canvas shown when a workflow has no configured nodes yet. */
export function createDefaultNodes(): WorkflowNodeData[] {
  return [
    { id: "trigger", type: "trigger", nodeType: "trigger", index: 1, label: "Trigger", description: TRIGGER_DESCRIPTION, config: {}, status: "draft" },
    { id: "action-1", type: "action", nodeType: "action", index: 2, label: "Action", description: ACTION_DESCRIPTION, config: {}, status: "draft" },
  ];
}

/** Placeholder nodes ("trigger", "action-…") exist only in the browser until an app is chosen. */
export function isPersistedNodeId(nodeId: string): boolean {
  return nodeId !== "trigger" && !nodeId.startsWith(LOCAL_ACTION_ID_PREFIX);
}

export function reindexNodes(nodes: WorkflowNodeData[]): WorkflowNodeData[] {
  return nodes.map((node, position) => ({ ...node, index: position + 1 }));
}

export function describeNode(nodeType: WorkflowNodeData["type"], appLabel: string): string {
  return nodeType === "trigger" ? `Starts when something happens in ${appLabel}` : `Does something in ${appLabel}`;
}

export function findTriggerNode(nodes: WorkflowNodeData[]): WorkflowNodeData | undefined {
  return nodes.find((node) => node.type === "trigger");
}

// ── Keys ─────────────────────────────────────────────────────────────────────

/** "New Lead Created" → "new_lead_created" (backend action/event keys). */
export function toSnakeCaseKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "_");
}

export function toEngineIntegrationKey(nodeIntegrationKey: string): string {
  return NODE_TO_ENGINE_INTEGRATION_KEY[nodeIntegrationKey] ?? nodeIntegrationKey;
}

export function canAutoSubscribe(node: WorkflowNodeData): boolean {
  return (
    node.type === "trigger" &&
    Boolean(node.eventLabel) &&
    AUTO_SUBSCRIBE_INTEGRATION_KEYS.has(toEngineIntegrationKey(node.integrationType ?? ""))
  );
}

/** 0 → "A", 25 → "Z", 26 → "AA" — used to auto-name new workflows. */
export function indexToLetterLabel(index: number): string {
  let label = "";
  let remaining = index;
  while (remaining >= 0) {
    label = String.fromCharCode(LETTER_A_CHAR_CODE + (remaining % LETTERS_IN_ALPHABET)) + label;
    remaining = Math.floor(remaining / LETTERS_IN_ALPHABET) - 1;
  }
  return label;
}

// ── Backend ↔ canvas ─────────────────────────────────────────────────────────

export function mapBackendNodeToCanvas(backendNode: WorkflowNodeRecord, position: number): WorkflowNodeData {
  let config: NodeConfig = backendNode.config ?? {};
  // The backend stores only webhook_id; the full webhook object is cached locally
  if (backendNode.type === "trigger" && config.webhook_id && !config.webhook) {
    const cachedWebhook = getCachedWebhookData(backendNode.id);
    if (cachedWebhook) config = { ...config, webhook: cachedWebhook };
  }

  const integrationKey = backendNode.integration_key;
  return {
    id: backendNode.id,
    type: backendNode.type,
    nodeType: backendNode.type,
    integrationType: integrationKey,
    index: backendNode.position ?? position + 1,
    label: integrationKey || (backendNode.type === "trigger" ? "Trigger" : "Action"),
    appLabel: integrationKey || undefined,
    eventLabel: backendNode.action_key || undefined,
    description: describeNode(backendNode.type, integrationKey),
    config,
    status: "draft",
    output_schema: backendNode.output_schema,
    sample_payload: backendNode.sample_payload,
  };
}

/** Test samples live only in memory; keep them when the server copy of the nodes refreshes. */
export function keepUnsavedTestData(serverNodes: WorkflowNodeData[], previousNodes: WorkflowNodeData[]): WorkflowNodeData[] {
  return serverNodes.map((serverNode) => {
    const previousConfig = previousNodes.find((previousNode) => previousNode.id === serverNode.id)?.config;
    if (!previousConfig) return serverNode;

    const mergedConfig: NodeConfig = { ...serverNode.config };
    if (previousConfig.testSamples !== undefined) mergedConfig.testSamples = previousConfig.testSamples;
    if (previousConfig.testPayload !== undefined) mergedConfig.testPayload = previousConfig.testPayload;
    return { ...serverNode, config: mergedConfig };
  });
}

// ── Trigger payload → variable picker ────────────────────────────────────────

function toReadableLabel(path: string): string {
  return path
    .split(".")
    .map((pathPart) => pathPart.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim())
    .map((pathPart) => pathPart.charAt(0).toUpperCase() + pathPart.slice(1))
    .join(" › ");
}

/**
 * Flattens a nested payload into picker items:
 * { name: "John", address: { city: "NY" } } → name, address.city ("Address › City").
 */
export function toVariablePickerItems(payload: NodeConfig, pathPrefix = ""): VariablePickerItem[] {
  return Object.entries(payload).flatMap(([key, value]) => {
    const path = pathPrefix ? `${pathPrefix}.${key}` : key;
    if (isPlainObject(value)) return toVariablePickerItems(value, path);
    return [{ id: path, label: toReadableLabel(path), description: String(value ?? "") }];
  });
}

/** The trigger's sample data: a caught webhook / test payload, or the saved sample. */
export function getTriggerSamplePayload(triggerNode: WorkflowNodeData | undefined): unknown {
  const triggerConfig = triggerNode?.config;
  return triggerConfig?.testPayload ?? triggerConfig?.test_payload ?? triggerNode?.sample_payload;
}

// ── Config → saved payloads ──────────────────────────────────────────────────

/** Leaf entries of a nested config, flattened (nested objects contribute their own keys). */
function collectLeafEntries(config: NodeConfig, shouldSkipKey: (key: string) => boolean = () => false): Array<[string, unknown]> {
  return Object.entries(config).flatMap(([key, value]): Array<[string, unknown]> => {
    if (shouldSkipKey(key)) return [];
    return isPlainObject(value) ? collectLeafEntries(value, shouldSkipKey) : [[key, value]];
  });
}

/** Every {{map:…}} token replaced by its fallback value; empty fields dropped. */
export function resolveConfigForSave(config: NodeConfig): NodeConfig {
  const resolvedEntries = collectLeafEntries(config).flatMap(([key, value]): Array<[string, unknown]> => {
    if (typeof value === "string") {
      const resolvedText = value.replace(MAP_TOKEN_PATTERN, (_token, _sourceField, fallbackValue: string) => fallbackValue).trim();
      return resolvedText ? [[key, resolvedText]] : [];
    }
    if (Array.isArray(value)) return [[key, value]];
    return value !== null && value !== undefined && value !== "" ? [[key, value]] : [];
  });
  return Object.fromEntries(resolvedEntries);
}

/** output_schema: the destination keys that contain mapped tokens, each set to null. */
export function extractOutputSchema(config: NodeConfig): Record<string, null> {
  const mappedKeys = collectLeafEntries(config)
    .filter(([, value]) => typeof value === "string" && HAS_MAP_TOKEN_PATTERN.test(value))
    .map(([key]) => [key, null] as const);
  return Object.fromEntries(mappedKeys);
}

function toFieldMapping(destinationField: string, value: string, sourceNodeId: string): CreateMappingPayload | null {
  const tokenMatches = Array.from(value.matchAll(MAP_TOKEN_PATTERN));

  if (tokenMatches.length === 0) {
    // Plain static text (e.g. "leads@company.com"); stray "{{" means an unfinished token
    return value.includes("{{") ? null : { mapping_type: "static", static_value: value, destination_field: destinationField };
  }

  const [onlyToken] = tokenMatches;
  const isWholeValueOneToken = tokenMatches.length === 1 && onlyToken.index === 0 && onlyToken[0].length === value.length;
  if (isWholeValueOneToken && onlyToken[1]) {
    return { mapping_type: "dynamic", source_node_id: sourceNodeId, source_field: onlyToken[1], destination_field: destinationField };
  }

  // Text mixed with tokens: the backend resolves each token at execution time
  return { mapping_type: "template", source_node_id: sourceNodeId, template: value, destination_field: destinationField };
}

/**
 * Converts an action node's config into backend field mappings:
 * one token → dynamic, plain text → static, text mixed with tokens → template.
 * Keys starting with "_" and connection metadata keys are skipped.
 */
export function extractFieldMappings(config: NodeConfig, sourceNodeId: string): CreateMappingPayload[] {
  const isSkippedKey = (key: string) => key.startsWith("_") || INTERNAL_MAPPING_KEYS.has(key);
  return collectLeafEntries(config, isSkippedKey).flatMap(([key, value]) => {
    if (typeof value !== "string" || !value.trim()) return [];
    const mapping = toFieldMapping(key, value, sourceNodeId);
    return mapping ? [mapping] : [];
  });
}
