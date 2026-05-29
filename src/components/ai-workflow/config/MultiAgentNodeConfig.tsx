"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

type AgentMode = "pipeline" | "parallel" | "supervisor";

interface AgentRoleConfig {
  name: string;
  instructions: string;
  tools: string[];
  custom_tools: { name: string; url: string }[];
  complexity: number;
  temperature: number;
  max_tokens: number;
}

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

const MODES: { id: AgentMode; label: string; icon: string; desc: string }[] = [
  {
    id: "pipeline",
    label: "Pipeline",
    icon: "→",
    desc: "Agents run in sequence, each building on previous output",
  },
  {
    id: "parallel",
    label: "Parallel",
    icon: "⟶⟶",
    desc: "All agents run at once, supervisor merges results",
  },
  {
    id: "supervisor",
    label: "Supervisor",
    icon: "◇",
    desc: "Supervisor dynamically decides which agent to call next",
  },
];

const DEFAULT_AGENT = (n: number): AgentRoleConfig => ({
  name: `Agent ${n}`,
  instructions: "",
  tools: [],
  custom_tools: [],
  complexity: 6,
  temperature: 0.7,
  max_tokens: 2000,
});

export function MultiAgentNodeConfig({ config, onChange }: Props) {
  const set = (key: string, val: unknown) => onChange({ ...config, [key]: val });

  const mode = (config.mode as AgentMode) ?? "pipeline";
  const supervisorInstructions =
    (config.supervisor_instructions as string) ?? "";
  const agents = (config.agents as AgentRoleConfig[]) ?? [
    DEFAULT_AGENT(1),
    DEFAULT_AGENT(2),
  ];
  const maxRounds = (config.max_rounds as number) ?? 5;
  const complexity = (config.complexity as number) ?? 6;
  const temperature = (config.temperature as number) ?? 0.7;
  const maxTokens = (config.max_tokens as number) ?? 2000;

  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const toggleExpand = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  const updateAgent = (
    i: number,
    field: keyof AgentRoleConfig,
    value: AgentRoleConfig[keyof AgentRoleConfig]
  ) => {
    const updated = [...agents];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...config, agents: updated });
  };

  const addAgent = () => {
    const newIndex = agents.length;
    const newAgent = DEFAULT_AGENT(newIndex + 1);
    onChange({ ...config, agents: [...agents, newAgent] });
    setExpanded((prev) => new Set(prev).add(newIndex));
  };

  const removeAgent = (i: number) => {
    onChange({ ...config, agents: agents.filter((_, idx) => idx !== i) });
    setExpanded((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < i) next.add(idx);
        else if (idx > i) next.add(idx - 1);
      });
      return next;
    });
  };

  const addCustomTool = (agentIndex: number) => {
    const updated = [...agents];
    updated[agentIndex] = {
      ...updated[agentIndex],
      custom_tools: [
        ...updated[agentIndex].custom_tools,
        { name: "", url: "" },
      ],
    };
    onChange({ ...config, agents: updated });
  };

  const updateCustomTool = (
    agentIndex: number,
    toolIndex: number,
    field: "name" | "url",
    value: string
  ) => {
    const updated = [...agents];
    const tools = [...updated[agentIndex].custom_tools];
    tools[toolIndex] = { ...tools[toolIndex], [field]: value };
    updated[agentIndex] = { ...updated[agentIndex], custom_tools: tools };
    onChange({ ...config, agents: updated });
  };

  const removeCustomTool = (agentIndex: number, toolIndex: number) => {
    const updated = [...agents];
    updated[agentIndex] = {
      ...updated[agentIndex],
      custom_tools: updated[agentIndex].custom_tools.filter(
        (_, idx) => idx !== toolIndex
      ),
    };
    onChange({ ...config, agents: updated });
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="nm-inset rounded-xl p-3 text-[11px] text-blue-400 leading-relaxed">
        The Multi-Agent Engine runs a crew of AI agents in one of three modes.
        Each agent has its own instructions, tools, and model settings.
      </div>

      {/* Mode selection */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        Mode
      </p>

      <div className="grid grid-cols-3 gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => set("mode", m.id)}
            title={m.desc}
            className={cn(
              "nm-card rounded-xl p-2 text-center transition-all",
              mode === m.id
                ? "border-2 border-purple-500 bg-purple-500/10"
                : "border border-transparent hover:border-white/10"
            )}
          >
            <span className="text-base">{m.icon}</span>
            <p className="text-[10px] font-bold text-foreground mt-0.5">
              {m.label}
            </p>
          </button>
        ))}
      </div>

      {/* Mode description */}
      <p className="text-[10px] text-muted-foreground/70">
        {MODES.find((m) => m.id === mode)?.desc}
      </p>

      {/* Supervisor Instructions — only for parallel or supervisor modes */}
      {(mode === "parallel" || mode === "supervisor") && (
        <>
          <div className="border-t border-white/5" />

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Supervisor Instructions
            </label>
            <div className="nm-inset rounded-xl px-3 py-2">
              <textarea
                rows={3}
                value={supervisorInstructions}
                onChange={(e) =>
                  set("supervisor_instructions", e.target.value)
                }
                placeholder="Synthesize the agents' outputs into a final coherent answer."
                className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
              />
            </div>
          </div>
        </>
      )}

      <div className="border-t border-white/5" />

      {/* Agents section */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Agents
        </p>
        <button
          className="nm-btn rounded-xl px-3 h-8 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
          onClick={addAgent}
        >
          + Add Agent
        </button>
      </div>

      <div className="space-y-2">
        {agents.map((agent, i) => (
          <div key={i} className="nm-card rounded-xl p-3 space-y-2">
            {/* Header row */}
            <div className="flex items-center gap-2">
              {/* Drag handle */}
              <span className="text-muted-foreground text-sm cursor-grab select-none shrink-0">
                ≡
              </span>

              {/* Agent badge */}
              <span className="nm-inset rounded-lg px-2 py-0.5 text-[10px] font-bold text-muted-foreground shrink-0">
                Agent {i + 1}
              </span>

              {/* Name input */}
              <div className="nm-inset rounded-lg flex items-center px-2 h-7 flex-1">
                <input
                  className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                  value={agent.name}
                  placeholder={`Agent ${i + 1}`}
                  onChange={(e) => updateAgent(i, "name", e.target.value)}
                />
              </div>

              {/* Chevron toggle */}
              <button
                className={cn(
                  "nm-card border border-transparent h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-all",
                  expanded.has(i) && "border-2 border-purple-500 bg-purple-500/10"
                )}
                onClick={() => toggleExpand(i)}
                title={expanded.has(i) ? "Collapse" : "Expand"}
              >
                {expanded.has(i) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>

              {/* Delete button */}
              <button
                className="nm-btn h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                onClick={() => removeAgent(i)}
                title="Delete agent"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Expanded content */}
            {expanded.has(i) && (
              <div className="space-y-3 pt-1">
                <div className="border-t border-white/5" />

                {/* Instructions */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Instructions
                  </label>
                  <div className="nm-inset rounded-xl px-3 py-2">
                    <textarea
                      rows={3}
                      value={agent.instructions}
                      onChange={(e) =>
                        updateAgent(i, "instructions", e.target.value)
                      }
                      placeholder="You are a specialist agent. Your role is to..."
                      className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Complexity */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Complexity
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={agent.complexity}
                      onChange={(e) =>
                        updateAgent(i, "complexity", Number(e.target.value))
                      }
                      className="flex-1 accent-purple-500"
                    />
                    <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
                      {agent.complexity}
                    </span>
                  </div>
                </div>

                {/* Temperature */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Temperature
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={agent.temperature}
                      onChange={(e) =>
                        updateAgent(i, "temperature", Number(e.target.value))
                      }
                      className="flex-1 accent-purple-500"
                    />
                    <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
                      {agent.temperature.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Max Tokens
                  </label>
                  <div className="nm-inset rounded-xl flex items-center px-3 h-9">
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={agent.max_tokens}
                      onChange={(e) =>
                        updateAgent(i, "max_tokens", Number(e.target.value))
                      }
                      className="flex-1 bg-transparent text-[12px] font-medium text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                {/* Custom Tools */}
                <div className="border-t border-white/5" />

                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Custom Tools
                  </p>
                  <button
                    className="nm-btn rounded-xl px-3 h-8 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                    onClick={() => addCustomTool(i)}
                  >
                    + Add
                  </button>
                </div>

                {agent.custom_tools.length > 0 && (
                  <div className="space-y-2">
                    {agent.custom_tools.map((tool, ti) => (
                      <div key={ti} className="flex items-center gap-2">
                        <div className="nm-inset rounded-xl flex items-center px-3 h-9 flex-1">
                          <input
                            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                            value={tool.name}
                            placeholder="Tool name"
                            onChange={(e) =>
                              updateCustomTool(i, ti, "name", e.target.value)
                            }
                          />
                        </div>
                        <div className="nm-inset rounded-xl flex items-center px-3 h-9" style={{ flex: 2 }}>
                          <input
                            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                            value={tool.url}
                            placeholder="https://api.example.com/tool"
                            onChange={(e) =>
                              updateCustomTool(i, ti, "url", e.target.value)
                            }
                          />
                        </div>
                        <button
                          className="nm-btn h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                          onClick={() => removeCustomTool(i, ti)}
                          title="Delete tool"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-white/5" />

      {/* Global Settings */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        Global Settings
      </p>

      {/* Max Rounds */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Max Rounds
        </label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="number"
            min={1}
            max={20}
            value={maxRounds}
            onChange={(e) => set("max_rounds", Number(e.target.value))}
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <p className="text-[10px] text-muted-foreground/70">
          Maximum orchestration rounds (1–20)
        </p>
      </div>

      {/* Global Complexity */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Complexity
        </label>
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
          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
            {complexity}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/70">
          Default complexity for agents that don&apos;t override it
        </p>
      </div>

      {/* Global Temperature */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Temperature
        </label>
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
          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
            {temperature.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Global Max Tokens */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Max Tokens
        </label>
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
