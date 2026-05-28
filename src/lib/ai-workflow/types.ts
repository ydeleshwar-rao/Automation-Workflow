// types.ts — shared TypeScript types for the AI Visual Workflow builder

import type { Node, Edge, Viewport } from "@xyflow/react";

// ── Node category colours ────────────────────────────────────────────────────
export type NodeCategory =
  | "trigger"
  | "ai"
  | "action"
  | "logic"
  | "transform"
  | "code";

export const CATEGORY_COLOR: Record<NodeCategory, string> = {
  trigger:   "#f97316", // orange
  ai:        "#8b5cf6", // violet
  action:    "#22c55e", // green
  logic:     "#eab308", // yellow
  transform: "#3b82f6", // blue
  code:      "#6b7280", // gray
};

export const CATEGORY_BG: Record<NodeCategory, string> = {
  trigger:   "rgba(249,115,22,0.12)",
  ai:        "rgba(139,92,246,0.12)",
  action:    "rgba(34,197,94,0.12)",
  logic:     "rgba(234,179,8,0.12)",
  transform: "rgba(59,130,246,0.12)",
  code:      "rgba(107,114,128,0.12)",
};

// ── Node data (stored inside React Flow node.data) ───────────────────────────
export interface AiNodeData extends Record<string, unknown> {
  label:       string;
  description?: string;
  category:    NodeCategory;
  nodeType:    string;   // e.g. "openai-chat", "if-else", "send-email"
  icon:        string;   // emoji or lucide icon name
  config:      Record<string, unknown>;
  // execution state (populated after run)
  runStatus?:  "idle" | "running" | "success" | "error";
  runOutput?:  unknown;
}

// ── Workflow shapes returned by the API ─────────────────────────────────────
export interface AiWorkflowRecord {
  id:          string;
  name:        string;
  description: string | null;
  status:      "draft" | "active" | "paused";
  nodes:       Node<AiNodeData>[];
  edges:       Edge[];
  viewport?:   Viewport;
  created_at:  string;
  updated_at:  string;
}

export interface AiWorkflowListItem {
  id:          string;
  name:        string;
  description: string | null;
  status:      "draft" | "active" | "paused";
  created_at:  string;
  updated_at:  string;
}

export interface AiWorkflowExecution {
  id:           string;
  workflow_id:  string;
  status:       "pending" | "running" | "success" | "failed";
  trigger:      "manual" | "schedule" | "webhook";
  node_results: Record<string, { status: string; output?: unknown; error?: string }> | null;
  error:        string | null;
  started_at:   string;
  finished_at:  string | null;
}
