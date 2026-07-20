"use client";

import React, { useState, useEffect } from "react";
import { X, Settings2, Trash2 } from "lucide-react";
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
const CONFIG_FIELDS: Record<string, Array<{ key: string; label: string; type: "text" | "textarea" | "number" | "select"; options?: string[] }>> = {
  "manual-trigger":  [],
  "schedule-trigger":[{ key: "cron", label: "Cron expression", type: "text" }],
  "webhook-trigger": [{ key: "method", label: "HTTP method", type: "select", options: ["GET","POST","PUT","DELETE"] }, { key: "path", label: "Path suffix", type: "text" }],
  "harness-prompt":  [{ key: "model", label: "Model", type: "text" }, { key: "systemPrompt", label: "System prompt", type: "textarea" }, { key: "userTemplate", label: "User template", type: "textarea" }, { key: "temperature", label: "Temperature", type: "number" }, { key: "maxTokens", label: "Max tokens", type: "number" }, { key: "complexity", label: "Complexity", type: "number" }, { key: "outputSchema", label: "Output schema JSON", type: "textarea" }],
  "harness-chain":   [{ key: "model", label: "Model", type: "text" }, { key: "steps", label: "Steps JSON array", type: "textarea" }],
  "harness-rag":     [{ key: "model", label: "Model", type: "text" }, { key: "systemPrompt", label: "System prompt", type: "textarea" }, { key: "topK", label: "Top K", type: "number" }, { key: "chunkSize", label: "Chunk size", type: "number" }, { key: "chunkOverlap", label: "Chunk overlap", type: "number" }, { key: "temperature", label: "Temperature", type: "number" }, { key: "maxTokens", label: "Max tokens", type: "number" }],
  "harness-agent":   [{ key: "model", label: "Model", type: "text" }, { key: "instructions", label: "Instructions", type: "textarea" }, { key: "tools", label: "Built-in tools JSON", type: "textarea" }, { key: "customTools", label: "Custom tools JSON", type: "textarea" }, { key: "mcpServers", label: "MCP servers JSON", type: "textarea" }, { key: "maxIterations", label: "Max iterations", type: "number" }, { key: "temperature", label: "Temperature", type: "number" }, { key: "maxTokens", label: "Max tokens", type: "number" }],
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
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
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
      className="w-[280px] flex flex-col h-full bg-[hsl(var(--surface))] border-l border-black/8 dark:border-white/5 shrink-0 animate-in slide-in-from-right-4 duration-200"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/5 shrink-0"
        style={{ borderTop: `3px solid ${color}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="nm-inset w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ borderLeft: `2px solid ${color}50` }}
          >
            {node.data.icon}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{node.data.category}</p>
            <p className="text-[12px] font-bold text-foreground leading-tight">{node.data.nodeType}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="nm-btn w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
        {/* Node label */}
        <NmField label="Node label">
          <div className="nm-inset rounded-xl flex items-center px-3 h-9">
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
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Configuration</span>
            </div>
            {fields.map((f) => (
              <NmField key={f.key} label={f.label}>
                {f.type === "textarea" ? (
                  <div className="nm-inset rounded-xl px-3 py-2">
                    <textarea
                      rows={3}
                      value={String(localConfig[f.key] ?? "")}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={`Enter ${f.label.toLowerCase()}…`}
                      className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                    />
                  </div>
                ) : f.type === "select" ? (
                  <div className="nm-inset rounded-xl flex items-center px-3 h-9">
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
                ) : (
                  <div className="nm-inset rounded-xl flex items-center px-3 h-9">
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
          <div className="nm-inset rounded-2xl p-4 text-center">
            <p className="text-[11px] text-muted-foreground">No configuration needed for this node.</p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-black/8 dark:border-white/5 flex items-center gap-2 shrink-0">
        <button
          onClick={apply}
          className={cn(
            "flex-1 h-9 rounded-xl text-[12px] font-bold text-primary-foreground transition-all",
            "bg-primary border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]",
            "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[5px_5px_0_hsl(var(--foreground))]",
            "dark:border-border dark:shadow-[3px_3px_0_hsl(var(--border))] dark:hover:shadow-[5px_5px_0_hsl(var(--border))]"
          )}
        >
          Apply
        </button>
        <button
          onClick={() => onDelete(node.id)}
          className="nm-btn h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive transition-all"
          title="Delete node"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
