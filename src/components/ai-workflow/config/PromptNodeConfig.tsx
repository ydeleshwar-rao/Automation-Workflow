"use client";
import React from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function PromptNodeConfig({ config, onChange }: Props) {
  const set = (key: string, val: unknown) => onChange({ ...config, [key]: val });
  const systemPrompt = (config.system_prompt as string) ?? "";
  const userTemplate = (config.user_template as string) ?? "{{input}}";
  const variablesRaw = Array.isArray(config.variables) ? (config.variables as string[]).join(", ") : "";
  const outputSchema = (config.output_schema as string) ?? "";
  const complexity   = (config.complexity as number) ?? 5;
  const temperature  = (config.temperature as number) ?? 0.7;
  const maxTokens    = (config.max_tokens as number) ?? 2000;

  return (
    <div className="space-y-4">
      {/* Basic */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Prompt</p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">System Prompt</label>
        <div className="nm-inset rounded-xl px-3 py-2">
          <textarea
            rows={3}
            value={systemPrompt}
            onChange={(e) => set("system_prompt", e.target.value)}
            placeholder="You are a helpful assistant…"
            className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">User Template</label>
        <div className="nm-inset rounded-xl px-3 py-2">
          <textarea
            rows={4}
            value={userTemplate}
            onChange={(e) => set("user_template", e.target.value)}
            placeholder="{{input}}"
            className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none font-mono"
          />
        </div>
        <p className="text-[10px] text-muted-foreground/70">Use {'{{variable}}'} for dynamic values</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Variables</label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            value={variablesRaw}
            onChange={(e) => set("variables", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder="name, topic, context"
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <p className="text-[10px] text-muted-foreground/70">Comma-separated variable names</p>
      </div>

      <div className="border-t border-white/5" />

      {/* Output */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Output</p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Output Schema (JSON)</label>
        <div className="nm-inset rounded-xl px-3 py-2">
          <textarea
            rows={3}
            value={outputSchema}
            onChange={(e) => set("output_schema", e.target.value)}
            placeholder={'{ "type": "object", "properties": {...} }'}
            className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none font-mono"
          />
        </div>
        <p className="text-[10px] text-muted-foreground/70">Optional — forces structured JSON output</p>
      </div>

      <div className="border-t border-white/5" />

      {/* Model */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Model Settings</p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Complexity {complexity}/10</label>
        <div className="flex items-center gap-2">
          <input type="range" min={1} max={10} step={1} value={complexity}
            onChange={(e) => set("complexity", Number(e.target.value))}
            className="flex-1 accent-purple-500" />
          <span className="text-[11px] font-mono text-muted-foreground w-4 text-right">{complexity}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70">Routes to a more powerful model at higher values</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Temperature {temperature.toFixed(1)}</label>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={1} step={0.1} value={temperature}
            onChange={(e) => set("temperature", Number(e.target.value))}
            className="flex-1 accent-purple-500" />
          <span className="text-[11px] font-mono text-muted-foreground w-6 text-right">{temperature.toFixed(1)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Max Tokens</label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input type="number" min={1} max={100000} value={maxTokens}
            onChange={(e) => set("max_tokens", Number(e.target.value))}
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground focus:outline-none" />
        </div>
      </div>
    </div>
  );
}
