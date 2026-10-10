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
  trigger:   "#fb923c",
  ai:        "#a78bfa",
  action:    "#34d399",
  logic:     "#fbbf24",
  transform: "#60a5fa",
  code:      "#94a3b8",
};

export const CATEGORY_BG: Record<NodeCategory, string> = {
  trigger:   "rgba(251,146,60,0.12)",
  ai:        "rgba(167,139,250,0.12)",
  action:    "rgba(52,211,153,0.12)",
  logic:     "rgba(251,191,36,0.12)",
  transform: "rgba(96,165,250,0.12)",
  code:      "rgba(148,163,184,0.12)",
};

// ── Node data (stored inside React Flow node.data) ───────────────────────────
export interface AiNodeData extends Record<string, unknown> {
  label:       string;
  description?: string;
  hint?:        string;
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
