import type { Edge, Node } from "@xyflow/react";
import type { AiNodeData } from "./types";

export type HarnessEngineType = "prompt" | "chain" | "rag" | "agent";

export interface HarnessFlowPayload {
  name: string;
  description?: string | null;
  engine_type: HarnessEngineType;
  provider: {
    default: {
      model: string;
      api_base?: string;
      api_key?: string;
    };
  };
  engine_config: Record<string, unknown>;
  is_active: boolean;
}

const SUPPORTED_NODE_TYPES = new Set([
  "harness-prompt",
  "harness-chain",
  "harness-rag",
  "harness-agent",
  "openai-chat",
  "claude-chat",
  "gemini-chat",
]);

export function getHarnessCandidateNodes(nodes: Node<AiNodeData>[]) {
  return nodes.filter((node) => SUPPORTED_NODE_TYPES.has(node.data.nodeType));
}

export function getMissingHarnessCapabilities(nodes: Node<AiNodeData>[]) {
  return nodes
    .filter((node) => node.data.category !== "trigger" && !SUPPORTED_NODE_TYPES.has(node.data.nodeType))
    .map((node) => ({
      id: node.id,
      label: node.data.label,
      nodeType: node.data.nodeType,
    }));
}

export function buildHarnessFlowPayload(
  workflowName: string,
  node: Node<AiNodeData>,
  fallbackProvider: { model: string; apiBase?: string; apiKey?: string },
  edges: Edge[]
): HarnessFlowPayload {
  const config = node.data.config ?? {};
  const model = stringValue(config.model) || fallbackProvider.model;
  const provider = {
    default: {
      model,
      ...(fallbackProvider.apiBase ? { api_base: fallbackProvider.apiBase } : {}),
      ...(fallbackProvider.apiKey ? { api_key: fallbackProvider.apiKey } : {}),
    },
  };

  return {
    name: `${workflowName || "AI Workflow"} - ${node.data.label}`,
    description: `Generated from visual node ${node.id}`,
    engine_type: resolveEngineType(node.data.nodeType),
    provider,
    engine_config: buildEngineConfig(node, edges),
    is_active: true,
  };
}

function resolveEngineType(nodeType: string): HarnessEngineType {
  if (nodeType === "harness-chain") return "chain";
  if (nodeType === "harness-rag") return "rag";
  if (nodeType === "harness-agent") return "agent";
  return "prompt";
}

function buildEngineConfig(node: Node<AiNodeData>, edges: Edge[]) {
  const config = node.data.config ?? {};

  if (node.data.nodeType === "harness-chain") {
    return {
      steps: parseJsonArray(config.steps) ?? [
        {
          name: "step_1",
          prompt_template: stringValue(config.promptTemplate) || "{{input}}",
          complexity: numberValue(config.complexity, 5),
          temperature: numberValue(config.temperature, 0.7),
          max_tokens: numberValue(config.maxTokens, 1024),
        },
      ],
    };
  }

  if (node.data.nodeType === "harness-rag") {
    return {
      system_prompt: stringValue(config.systemPrompt) || "Answer using only the provided context. If unsure, say so.",
      chunk_size: numberValue(config.chunkSize, 512),
      chunk_overlap: numberValue(config.chunkOverlap, 50),
      top_k: numberValue(config.topK, 4),
      complexity: numberValue(config.complexity, 5),
      temperature: numberValue(config.temperature, 0.3),
      max_tokens: numberValue(config.maxTokens, 1024),
    };
  }

  if (node.data.nodeType === "harness-agent") {
    return {
      instructions: stringValue(config.instructions) || "Complete the user request.",
      tools: parseJsonArray(config.tools) ?? [],
      custom_tools: parseJsonArray(config.customTools) ?? [],
      mcp_servers: parseJsonArray(config.mcpServers) ?? [],
      max_iterations: numberValue(config.maxIterations, 10),
      complexity: numberValue(config.complexity, 8),
      temperature: numberValue(config.temperature, 0.7),
      max_tokens: numberValue(config.maxTokens, 2048),
    };
  }

  return {
    system_prompt: stringValue(config.systemPrompt) || "You are a helpful assistant.",
    user_template: stringValue(config.userTemplate) || stringValue(config.userPrompt) || stringValue(config.prompt) || "{{input}}",
    variables: inferVariables(stringValue(config.userTemplate) || stringValue(config.userPrompt) || stringValue(config.prompt)),
    output_schema: parseJsonObject(config.outputSchema),
    complexity: numberValue(config.complexity, 5),
    temperature: numberValue(config.temperature, 0.7),
    max_tokens: numberValue(config.maxTokens, 1024),
    visual_edges: edges.filter((edge) => edge.source === node.id || edge.target === node.id).length,
  };
}

function inferVariables(template: string) {
  return Array.from(template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)).map((match) => match[1]);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseJsonObject(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
