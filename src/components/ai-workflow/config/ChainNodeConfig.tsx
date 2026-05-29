import React, { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface ChainStep {
  name: string;
  prompt_template: string;
  complexity: number;
  temperature: number;
  max_tokens: number;
  output_schema: string;
}

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function ChainNodeConfig({ config, onChange }: Props) {
  const steps = (config.steps as ChainStep[]) ?? [
    {
      name: "Step 1",
      prompt_template: "{{input}}",
      complexity: 5,
      temperature: 0.7,
      max_tokens: 1000,
      output_schema: "",
    },
  ];

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

  const updateStep = (i: number, field: keyof ChainStep, value: string | number) => {
    const updated = [...steps];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...config, steps: updated });
  };

  const addStep = () => {
    const newStep: ChainStep = {
      name: "Step " + (steps.length + 1),
      prompt_template: "{{input}}",
      complexity: 5,
      temperature: 0.7,
      max_tokens: 1000,
      output_schema: "",
    };
    const newIndex = steps.length;
    onChange({ ...config, steps: [...steps, newStep] });
    setExpanded((prev) => new Set(prev).add(newIndex));
  };

  const removeStep = (i: number) => {
    onChange({ ...config, steps: steps.filter((_, idx) => idx !== i) });
    setExpanded((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < i) next.add(idx);
        else if (idx > i) next.add(idx - 1);
      });
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="nm-inset rounded-xl p-3 text-[11px] text-blue-400 leading-relaxed">
        The Chain Engine executes sequential LLM steps where each step&apos;s output feeds into the next. Use{" "}
        <span className="font-mono">{"{{input}}"}</span>,{" "}
        <span className="font-mono">{"{{step_name}}"}</span>, or{" "}
        <span className="font-mono">{"{{variables.key}}"}</span> in prompt templates.
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="nm-card rounded-xl p-3 space-y-2">
            {/* Header row */}
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-bold shrink-0">
                {i + 1}
              </span>

              <div className="nm-inset rounded-xl flex items-center px-3 h-8 flex-1">
                <input
                  className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                  value={step.name}
                  placeholder="Step name"
                  onChange={(e) => updateStep(i, "name", e.target.value)}
                />
              </div>

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

              <button
                className="nm-btn h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                onClick={() => removeStep(i)}
                title="Delete step"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Expanded content */}
            {expanded.has(i) && (
              <div className="space-y-3 pt-1">
                <div className="border-t border-white/5" />

                {/* Prompt Template */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Prompt Template
                  </label>
                  <div className="nm-inset rounded-xl px-3 py-2">
                    <textarea
                      rows={3}
                      className="w-full bg-transparent text-[12px] font-medium font-mono text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                      value={step.prompt_template}
                      placeholder="{{input}}"
                      onChange={(e) => updateStep(i, "prompt_template", e.target.value)}
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
                      className="flex-1 accent-purple-500"
                      min={1}
                      max={10}
                      step={1}
                      value={step.complexity}
                      onChange={(e) => updateStep(i, "complexity", Number(e.target.value))}
                    />
                    <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
                      {step.complexity}
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
                      className="flex-1 accent-purple-500"
                      min={0}
                      max={2}
                      step={0.1}
                      value={step.temperature}
                      onChange={(e) => updateStep(i, "temperature", Number(e.target.value))}
                    />
                    <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">
                      {step.temperature.toFixed(1)}
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
                      className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                      value={step.max_tokens}
                      min={1}
                      max={32000}
                      placeholder="1000"
                      onChange={(e) => updateStep(i, "max_tokens", Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Output Schema */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Output Schema <span className="normal-case font-normal">(optional)</span>
                  </label>
                  <div className="nm-inset rounded-xl px-3 py-2">
                    <textarea
                      rows={3}
                      className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                      value={step.output_schema}
                      placeholder='{"type": "object", "properties": {...}}'
                      onChange={(e) => updateStep(i, "output_schema", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        className="nm-btn rounded-xl px-3 h-8 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
        onClick={addStep}
      >
        + Add Step
      </button>
    </div>
  );
}
