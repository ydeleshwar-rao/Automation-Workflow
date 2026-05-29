"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { BuiltInTool, CustomTool, McpServer } from "@/src/lib/ai-workflow/engineTypes";

const BUILT_IN_TOOLS = [
  { id: 'http_request' as BuiltInTool, label: 'HTTP Request',  description: 'Call any URL' },
  { id: 'calculator'   as BuiltInTool, label: 'Calculator',    description: 'Evaluate math expressions' },
  { id: 'datetime'     as BuiltInTool, label: 'Date & Time',   description: 'Get current UTC timestamp' },
  { id: 'json_parser'  as BuiltInTool, label: 'JSON Parser',   description: 'Parse JSON and extract by path' },
];

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function AgentNodeConfig({ config, onChange }: Props) {
  const set = (key: string, val: unknown) => onChange({ ...config, [key]: val });

  const instructions   = (config.instructions as string) ?? "";
  const tools          = (config.tools as BuiltInTool[]) ?? [];
  const customTools    = (config.custom_tools as CustomTool[]) ?? [];
  const mcpServers     = (config.mcp_servers as McpServer[]) ?? [];
  const maxIterations  = (config.max_iterations as number) ?? 10;
  const complexity     = (config.complexity as number) ?? 8;
  const temperature    = (config.temperature as number) ?? 0.5;
  const maxTokens      = (config.max_tokens as number) ?? 4000;

  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());

  const toggleTool = (id: BuiltInTool) => {
    const updated = tools.includes(id) ? tools.filter((t) => t !== id) : [...tools, id];
    onChange({ ...config, tools: updated });
  };

  const toggleExpandTool = (i: number) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  const addCustomTool = () => {
    const newTool: CustomTool = { name: "", description: "", url: "" };
    const newIndex = customTools.length;
    onChange({ ...config, custom_tools: [...customTools, newTool] });
    setExpandedTools((prev) => new Set(prev).add(newIndex));
  };

  const updateCustomTool = (i: number, field: keyof CustomTool, value: string) => {
    const updated = [...customTools];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...config, custom_tools: updated });
  };

  const removeCustomTool = (i: number) => {
    onChange({ ...config, custom_tools: customTools.filter((_, idx) => idx !== i) });
    setExpandedTools((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < i) next.add(idx);
        else if (idx > i) next.add(idx - 1);
      });
      return next;
    });
  };

  const addMcpServer = () => {
    onChange({ ...config, mcp_servers: [...mcpServers, { name: "", url: "" }] });
  };

  const updateMcpServer = (i: number, field: keyof McpServer, value: string) => {
    const updated = [...mcpServers];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...config, mcp_servers: updated });
  };

  const removeMcpServer = (i: number) => {
    onChange({ ...config, mcp_servers: mcpServers.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="nm-inset rounded-xl p-3 text-[11px] text-blue-400 leading-relaxed">
        The Agent Engine runs an autonomous ReAct loop (Reason → Act → Observe). Enable tools below and configure instructions to shape the agent&apos;s behaviour.
      </div>

      {/* Instructions */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Instructions</p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Agent Instructions</label>
        <div className="nm-inset rounded-xl px-3 py-2">
          <textarea
            rows={4}
            value={instructions}
            onChange={(e) => set("instructions", e.target.value)}
            placeholder="You are a helpful AI assistant. Use tools to complete tasks."
            className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
          />
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Built-in Tools */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Built-in Tools</p>

      <div className="grid grid-cols-2 gap-2">
        {BUILT_IN_TOOLS.map((tool) => (
          <div
            key={tool.id}
            className="nm-inset rounded-xl p-2.5 flex items-start gap-2 cursor-pointer"
            onClick={() => toggleTool(tool.id)}
          >
            <input
              type="checkbox"
              checked={tools.includes(tool.id)}
              readOnly
              className="mt-0.5 accent-purple-500"
            />
            <div>
              <p className="text-[11px] font-bold text-foreground">{tool.label}</p>
              <p className="text-[10px] text-muted-foreground">{tool.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/5" />

      {/* Custom Tools */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Custom Tools</p>
        <button
          className="nm-btn rounded-xl px-3 h-8 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
          onClick={addCustomTool}
        >
          + Add Tool
        </button>
      </div>

      {customTools.length > 0 && (
        <div className="space-y-2">
          {customTools.map((tool, i) => (
            <div key={i} className="nm-card rounded-xl p-3 space-y-2">
              {/* Header row */}
              <div className="flex items-center gap-2">
                <div className="nm-inset rounded-xl flex items-center px-3 h-8 flex-1">
                  <input
                    className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                    value={tool.name}
                    placeholder="Tool name"
                    onChange={(e) => updateCustomTool(i, "name", e.target.value)}
                  />
                </div>

                <button
                  className={cn(
                    "nm-card border border-transparent h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-all",
                    expandedTools.has(i) && "border-2 border-purple-500 bg-purple-500/10"
                  )}
                  onClick={() => toggleExpandTool(i)}
                  title={expandedTools.has(i) ? "Collapse" : "Expand"}
                >
                  {expandedTools.has(i) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>

                <button
                  className="nm-btn h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                  onClick={() => removeCustomTool(i)}
                  title="Delete tool"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Expanded fields */}
              {expandedTools.has(i) && (
                <div className="space-y-2 pt-1">
                  <div className="border-t border-white/5" />

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                    <div className="nm-inset rounded-xl flex items-center px-3 h-9">
                      <input
                        className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                        value={tool.description}
                        placeholder="What this tool does"
                        onChange={(e) => updateCustomTool(i, "description", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">URL</label>
                    <div className="nm-inset rounded-xl flex items-center px-3 h-9">
                      <input
                        className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                        value={tool.url}
                        placeholder="https://api.example.com/tool"
                        onChange={(e) => updateCustomTool(i, "url", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-white/5" />

      {/* MCP Servers */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">MCP Servers</p>
        <button
          className="nm-btn rounded-xl px-3 h-8 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
          onClick={addMcpServer}
        >
          + Add Server
        </button>
      </div>

      {mcpServers.length > 0 && (
        <div className="space-y-2">
          {mcpServers.map((server, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="nm-inset rounded-xl flex items-center px-3 h-9 flex-1">
                <input
                  className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                  value={server.name}
                  placeholder="Server name"
                  onChange={(e) => updateMcpServer(i, "name", e.target.value)}
                />
              </div>
              <div className="nm-inset rounded-xl flex items-center px-3 h-9" style={{ flex: 2 }}>
                <input
                  className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                  value={server.url}
                  placeholder="https://mcp.example.com"
                  onChange={(e) => updateMcpServer(i, "url", e.target.value)}
                />
              </div>
              <button
                className="nm-btn h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                onClick={() => removeMcpServer(i)}
                title="Delete server"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-white/5" />

      {/* Agent Settings */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Agent Settings</p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Max Iterations</label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="number"
            min={1}
            max={50}
            value={maxIterations}
            onChange={(e) => set("max_iterations", Number(e.target.value))}
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <p className="text-[10px] text-muted-foreground/70">Maximum ReAct loop iterations (1–50)</p>
      </div>

      <div className="border-t border-white/5" />

      {/* Model Settings */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Model Settings</p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Complexity {complexity}/10</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={complexity}
            onChange={(e) => set("complexity", Number(e.target.value))}
            className="flex-1 accent-purple-500"
          />
          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{complexity}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70">Routes to a more powerful model at higher values</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Temperature {temperature.toFixed(1)}</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={temperature}
            onChange={(e) => set("temperature", Number(e.target.value))}
            className="flex-1 accent-purple-500"
          />
          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{temperature.toFixed(1)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Max Tokens</label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="number"
            min={1}
            max={100000}
            value={maxTokens}
            onChange={(e) => set("max_tokens", Number(e.target.value))}
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
