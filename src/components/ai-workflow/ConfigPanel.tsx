"use client";

import React, { useState, useEffect } from "react";
import { Info, Settings2, Trash2, X } from "lucide-react";
import type { Node } from "@xyflow/react";
import type { AiNodeData } from "@/src/lib/ai-workflow/types";
import { CATEGORY_COLOR } from "@/src/lib/ai-workflow/types";
import { cn } from "@/src/lib/utils";

interface ConfigPanelProps {
  node: Node<AiNodeData> | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<AiNodeData>) => void;
  onDelete: (nodeId: string) => void;
}

// ── Config field types ────────────────────────────────────────────────────────
const CONFIG_FIELDS: Record<string, Array<{ key: string; label: string; type: "text" | "textarea" | "number" | "select" | "checkbox"; options?: string[]; hint?: string }>> = {
  "manual-trigger":  [],
  "schedule-trigger":[{ key: "cron", label: "Cron expression", type: "text" }],
  "webhook-trigger": [{ key: "method", label: "HTTP method", type: "select", options: ["GET","POST","PUT","DELETE"] }, { key: "path", label: "Path suffix", type: "text" }],
  "harness-prompt":  [{ key: "system_prompt", label: "System prompt", type: "textarea" }, { key: "user_template", label: "User template", type: "textarea", hint: "Use {{input}} and any variable names you pass at run time." }, { key: "variables", label: "Variables JSON array", type: "textarea" }, { key: "output_schema", label: "Output schema JSON", type: "textarea" }, { key: "complexity", label: "Complexity 1-10", type: "number" }, { key: "temperature", label: "Temperature", type: "number" }, { key: "max_tokens", label: "Max tokens", type: "number" }],
  "harness-chain":   [{ key: "steps", label: "Steps JSON array", type: "textarea", hint: "Each step needs name and prompt_template. Later steps can reference previous step names." }],
  "harness-rag":     [{ key: "system_prompt", label: "System prompt", type: "textarea" }, { key: "top_k", label: "Top K", type: "number" }, { key: "chunk_size", label: "Chunk size", type: "number" }, { key: "chunk_overlap", label: "Chunk overlap", type: "number" }, { key: "complexity", label: "Complexity 1-10", type: "number" }, { key: "temperature", label: "Temperature", type: "number" }, { key: "max_tokens", label: "Max tokens", type: "number" }],
  "harness-agent":   [{ key: "instructions", label: "Instructions", type: "textarea" }, { key: "tools", label: "Built-in tools JSON", type: "textarea", hint: "Allowed: http_request, calculator, datetime, json_parser." }, { key: "custom_tools", label: "Custom tools JSON", type: "textarea" }, { key: "mcp_servers", label: "MCP servers JSON", type: "textarea" }, { key: "max_iterations", label: "Max iterations", type: "number" }, { key: "complexity", label: "Complexity 1-10", type: "number" }, { key: "temperature", label: "Temperature", type: "number" }, { key: "max_tokens", label: "Max tokens", type: "number" }],
  "harness-stream":  [{ key: "system_prompt", label: "System prompt", type: "textarea" }, { key: "user_template", label: "User template", type: "textarea" }, { key: "variables", label: "Variables JSON array", type: "textarea" }, { key: "complexity", label: "Complexity 1-10", type: "number" }, { key: "temperature", label: "Temperature", type: "number" }, { key: "max_tokens", label: "Max tokens", type: "number" }],
  "harness-vision":  [{ key: "system_prompt", label: "System prompt", type: "textarea" }, { key: "user_template", label: "User template", type: "textarea", hint: "Runtime variables should include image_url or image_base64." }, { key: "output_schema", label: "Output schema JSON", type: "textarea" }, { key: "complexity", label: "Complexity 1-10", type: "number" }, { key: "temperature", label: "Temperature", type: "number" }, { key: "max_tokens", label: "Max tokens", type: "number" }],
  "harness-graph-rag": [{ key: "system_prompt", label: "System prompt", type: "textarea" }, { key: "top_k", label: "Top K", type: "number" }, { key: "hop_depth", label: "Hop depth", type: "number" }, { key: "extract_entities", label: "Extract entities", type: "checkbox" }, { key: "chunk_size", label: "Chunk size", type: "number" }, { key: "chunk_overlap", label: "Chunk overlap", type: "number" }, { key: "complexity", label: "Complexity 1-10", type: "number" }, { key: "temperature", label: "Temperature", type: "number" }, { key: "max_tokens", label: "Max tokens", type: "number" }],
  "harness-multi-agent": [{ key: "mode", label: "Mode", type: "select", options: ["pipeline","parallel","supervisor"] }, { key: "supervisor_instructions", label: "Supervisor instructions", type: "textarea" }, { key: "agents", label: "Agents JSON array", type: "textarea" }, { key: "max_rounds", label: "Max rounds", type: "number" }, { key: "complexity", label: "Complexity 1-10", type: "number" }, { key: "temperature", label: "Temperature", type: "number" }, { key: "max_tokens", label: "Max tokens", type: "number" }],
  "harness-dspy": [{ key: "program_type", label: "Program type", type: "select", options: ["predict","chain_of_thought"] }, { key: "task_description", label: "Task description", type: "textarea" }, { key: "input_fields", label: "Input fields JSON array", type: "textarea" }, { key: "output_fields", label: "Output fields JSON array", type: "textarea" }, { key: "examples", label: "Examples JSON array", type: "textarea" }, { key: "complexity", label: "Complexity 1-10", type: "number" }, { key: "temperature", label: "Temperature", type: "number" }, { key: "max_tokens", label: "Max tokens", type: "number" }],
  "openai-chat":     [{ key: "model", label: "Model", type: "select", options: ["gpt-4o","gpt-4o-mini","gpt-3.5-turbo"] }, { key: "systemPrompt", label: "System Prompt", type: "textarea" }, { key: "userPrompt", label: "User Prompt", type: "textarea" }, { key: "temperature", label: "Temperature (0–1)", type: "number" }],
  "claude-chat":     [{ key: "model", label: "Model", type: "select", options: ["claude-sonnet-4-6","claude-opus-4-7","claude-haiku-4-5-20251001"] }, { key: "systemPrompt", label: "System Prompt", type: "textarea" }, { key: "userPrompt", label: "User Prompt", type: "textarea" }, { key: "maxTokens", label: "Max tokens", type: "number" }],
  "gemini-chat":     [{ key: "model", label: "Model", type: "select", options: ["gemini-1.5-pro","gemini-1.5-flash"] }, { key: "prompt", label: "Prompt", type: "textarea" }],
  "send-email":      [{ key: "to", label: "To email", type: "text" }, { key: "subject", label: "Subject", type: "text" }, { key: "body", label: "Body", type: "textarea" }],
  "http-request":    [{ key: "method", label: "Method", type: "select", options: ["GET","POST","PUT","DELETE","PATCH"] }, { key: "url", label: "URL", type: "text" }],
  "if-else":         [{ key: "condition", label: "Condition (JS expression)", type: "textarea" }],
  "set-variable":    [{ key: "fields", label: "Fields (JSON array)", type: "textarea" }],
  "wait":            [{ key: "delay", label: "Delay", type: "number" }, { key: "unit", label: "Unit", type: "select", options: ["seconds","minutes","hours"] }],
  "js-code":         [{ key: "code", label: "JavaScript code", type: "textarea" }],
};

const getFields = (nodeType: string) => CONFIG_FIELDS[nodeType] ?? [];

// ── NmInput / NmTextarea / NmSelect ──────────────────────────────────────────
function NmField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

// ── ConfigPanel ───────────────────────────────────────────────────────────────
export function ConfigPanel({ node, onClose, onUpdate, onDelete }: ConfigPanelProps) {
  const [localLabel, setLocalLabel] = useState("");
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!node) return;
    setLocalLabel(node.data.label);
    setLocalConfig({ ...node.data.config });
  }, [node?.id]);

  if (!node) return null;

  const color  = CATEGORY_COLOR[node.data.category];
  const fields = getFields(node.data.nodeType);

  const apply = () => {
    onUpdate(node.id, { label: localLabel, config: localConfig });
  };

  const setField = (key: string, val: unknown) =>
    setLocalConfig((prev) => ({ ...prev, [key]: val }));

  return (
    <aside
      className="w-[280px] flex flex-col h-full bg-[hsl(var(--surface))] border-l border-foreground/15 shrink-0 animate-in slide-in-from-right-4 duration-200"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-foreground/10 shrink-0"
        style={{ borderTop: `2px solid ${color}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md border border-foreground/15 bg-card flex items-center justify-center text-sm"
            style={{ borderLeft: `2px solid ${color}50` }}
          >
            {node.data.icon}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{node.data.category}</p>
            <p className="text-[12px] font-semibold text-foreground leading-tight">{node.data.nodeType}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="nm-btn w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
        {/* Node label */}
        <NmField label="Node label">
          <div className="rounded-lg border border-foreground/25 bg-card flex items-center px-3 h-9 shadow-sm">
            <input
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              placeholder="Node label…"
              className="flex-1 bg-transparent text-[13px] font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </NmField>

        {/* Dynamic config fields */}
        {fields.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Configuration</span>
            </div>
            {node.data.hint && (
              <div className="rounded-lg border border-foreground/15 bg-card p-3 flex gap-2 shadow-sm">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11.5px] text-muted-foreground leading-snug">{node.data.hint}</p>
              </div>
            )}
            {fields.map((f) => (
              <NmField key={f.key} label={f.label}>
                {f.type === "textarea" ? (
                  <div className="rounded-lg border border-foreground/25 bg-card px-3 py-2 shadow-sm">
                    <textarea
                      rows={3}
                      value={String(localConfig[f.key] ?? "")}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={`Enter ${f.label.toLowerCase()}…`}
                      className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                    />
                    {f.hint && <p className="mt-1.5 text-[10.5px] text-muted-foreground leading-snug">{f.hint}</p>}
                  </div>
                ) : f.type === "select" ? (
                  <div className="rounded-lg border border-foreground/25 bg-card flex items-center px-3 h-9 shadow-sm">
                    <select
                      value={String(localConfig[f.key] ?? "")}
                      onChange={(e) => setField(f.key, e.target.value)}
                      className="flex-1 bg-transparent text-[12px] font-medium text-foreground focus:outline-none appearance-none"
                    >
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                ) : f.type === "checkbox" ? (
                  <label className="rounded-lg border border-foreground/25 bg-card flex items-center gap-2 px-3 h-9 cursor-pointer shadow-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(localConfig[f.key])}
                      onChange={(e) => setField(f.key, e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-[12px] font-medium text-foreground">Enabled</span>
                  </label>
                ) : (
                  <div className="rounded-lg border border-foreground/25 bg-card flex items-center px-3 h-9 shadow-sm">
                    <input
                      type={f.type}
                      value={String(localConfig[f.key] ?? "")}
                      onChange={(e) => setField(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
                      placeholder={`Enter ${f.label.toLowerCase()}…`}
                      className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                )}
              </NmField>
            ))}
          </>
        )}

        {fields.length === 0 && (
          <div className="rounded-lg border border-foreground/15 bg-card p-4 text-center shadow-sm">
            <p className="text-[11px] text-muted-foreground">No configuration needed for this node.</p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-foreground/10 flex items-center gap-2 shrink-0">
        <button
          onClick={apply}
          className={cn(
            "flex-1 h-9 rounded-lg text-[12px] font-medium text-primary-foreground transition-all",
            "bg-primary border border-foreground/70 shadow-[2px_2px_0_rgba(5,47,57,0.72)]",
            "hover:-translate-x-px hover:-translate-y-px hover:bg-primary/90 hover:shadow-[3px_3px_0_rgba(5,47,57,0.72)]",
            "dark:border-border/60 dark:shadow-[2px_2px_0_rgba(4,14,20,0.55)] dark:hover:shadow-[3px_3px_0_rgba(4,14,20,0.6)]"
          )}
        >
          Apply
        </button>
        <button
          onClick={() => onDelete(node.id)}
          className="nm-btn h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive transition-all"
          title="Delete node"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
