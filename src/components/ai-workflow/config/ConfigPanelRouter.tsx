"use client";
import React from "react";
import { PromptNodeConfig }     from "./PromptNodeConfig";
import { ChainNodeConfig }      from "./ChainNodeConfig";
import { RagNodeConfig }        from "./RagNodeConfig";
import { StreamNodeConfig }     from "./StreamNodeConfig";
import { VisionNodeConfig }     from "./VisionNodeConfig";
import { AgentNodeConfig }      from "./AgentNodeConfig";
import { GraphRagNodeConfig }   from "./GraphRagNodeConfig";
import { MultiAgentNodeConfig } from "./MultiAgentNodeConfig";
import { DSPyNodeConfig }       from "./DSPyNodeConfig";
import { SqlNodeConfig }        from "./SqlNodeConfig";
import { NoSqlNodeConfig }      from "./NoSqlNodeConfig";

interface ConfigPanelRouterProps {
  nodeType: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

const CONFIG_FIELDS: Record<string, Array<{ key: string; label: string; type: "text" | "textarea" | "number" | "select"; options?: string[] }>> = {
  "manual-trigger":  [],
  "schedule-trigger":[{ key: "cron", label: "Cron expression", type: "text" }],
  "webhook-trigger": [{ key: "method", label: "HTTP method", type: "select", options: ["GET","POST","PUT","DELETE"] }, { key: "path", label: "Path suffix", type: "text" }],
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

function FallbackConfig({
  nodeType,
  config,
  onChange,
}: {
  nodeType: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const fields = CONFIG_FIELDS[nodeType] ?? [];

  if (fields.length === 0) {
    return (
      <div className="space-y-4">
        <div className="nm-inset rounded-xl p-3 text-[11px] text-blue-400 leading-relaxed">
          No configuration needed for this node.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const rawVal = config[field.key];

        if (field.type === "textarea") {
          const value = (rawVal as string) ?? "";
          return (
            <div key={field.key} className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {field.label}
              </label>
              <div className="nm-inset rounded-xl px-3 py-2">
                <textarea
                  rows={3}
                  value={value}
                  onChange={(e) => onChange({ ...config, [field.key]: e.target.value })}
                  className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                />
              </div>
            </div>
          );
        }

        if (field.type === "select") {
          const value = (rawVal as string) ?? (field.options?.[0] ?? "");
          return (
            <div key={field.key} className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {field.label}
              </label>
              <div className="nm-inset rounded-xl flex items-center px-3 h-9">
                <select
                  value={value}
                  onChange={(e) => onChange({ ...config, [field.key]: e.target.value })}
                  className="flex-1 bg-transparent text-[12px] font-medium text-foreground focus:outline-none appearance-none"
                >
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        }

        if (field.type === "number") {
          const value = (rawVal as number) ?? 0;
          return (
            <div key={field.key} className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {field.label}
              </label>
              <div className="nm-inset rounded-xl flex items-center px-3 h-9">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => onChange({ ...config, [field.key]: Number(e.target.value) })}
                  className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>
          );
        }

        // default: text
        const value = (rawVal as string) ?? "";
        return (
          <div key={field.key} className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {field.label}
            </label>
            <div className="nm-inset rounded-xl flex items-center px-3 h-9">
              <input
                type="text"
                value={value}
                onChange={(e) => onChange({ ...config, [field.key]: e.target.value })}
                className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const ENGINE_MAP: Record<string, React.ComponentType<{ config: Record<string, unknown>; onChange: (config: Record<string, unknown>) => void }>> = {
  'prompt-engine':      PromptNodeConfig,
  'chain-engine':       ChainNodeConfig,
  'rag-engine':         RagNodeConfig,
  'stream-engine':      StreamNodeConfig,
  'vision-engine':      VisionNodeConfig,
  'agent-engine':       AgentNodeConfig,
  'graph-rag-engine':   GraphRagNodeConfig,
  'multi-agent-engine': MultiAgentNodeConfig,
  'dspy-engine':        DSPyNodeConfig,
  'sql-engine':         SqlNodeConfig,
  'nosql-engine':       NoSqlNodeConfig,
};

export function ConfigPanelRouter({ nodeType, config, onChange }: ConfigPanelRouterProps) {
  const EnginePanel = ENGINE_MAP[nodeType];
  if (EnginePanel) return <EnginePanel config={config} onChange={onChange} />;
  return <FallbackConfig nodeType={nodeType} config={config} onChange={onChange} />;
}
