"use client";
import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

type ProgramType = 'predict' | 'chain_of_thought';

interface DSPyExample {
  inputs: Record<string, string>;
  outputs: Record<string, string>;
}

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

const PROGRAM_TYPES = [
  { id: 'predict' as ProgramType,          label: 'Predict',          desc: 'Direct answer' },
  { id: 'chain_of_thought' as ProgramType, label: 'Chain of Thought', desc: 'Step-by-step reasoning' },
];

export function DSPyNodeConfig({ config, onChange }: Props) {
  const set = (key: string, val: unknown) => onChange({ ...config, [key]: val });

  const programType     = (config.program_type as ProgramType) ?? 'predict';
  const taskDescription = (config.task_description as string) ?? '';
  const inputFields     = (config.input_fields as string[]) ?? ['input'];
  const outputFields    = (config.output_fields as string[]) ?? ['output'];
  const examples        = (config.examples as DSPyExample[]) ?? [];
  const complexity      = (config.complexity as number) ?? 5;
  const temperature     = (config.temperature as number) ?? 0.0;
  const maxTokens       = (config.max_tokens as number) ?? 2000;

  const [inputDraft, setInputDraft]   = useState('');
  const [outputDraft, setOutputDraft] = useState('');
  const [expandedExamples, setExpandedExamples] = useState<Set<number>>(new Set());

  /* ── Tag input helpers ─────────────────────────────────────────── */
  const addInputField = () => {
    const trimmed = inputDraft.trim();
    if (trimmed && !inputFields.includes(trimmed)) {
      set('input_fields', [...inputFields, trimmed]);
    }
    setInputDraft('');
  };

  const removeInputField = (field: string) => {
    set('input_fields', inputFields.filter((f) => f !== field));
  };

  const addOutputField = () => {
    const trimmed = outputDraft.trim();
    if (trimmed && !outputFields.includes(trimmed)) {
      set('output_fields', [...outputFields, trimmed]);
    }
    setOutputDraft('');
  };

  const removeOutputField = (field: string) => {
    set('output_fields', outputFields.filter((f) => f !== field));
  };

  /* ── Example helpers ───────────────────────────────────────────── */
  const addExample = () => {
    const blank: DSPyExample = {
      inputs:  Object.fromEntries(inputFields.map((f) => [f, ''])),
      outputs: Object.fromEntries(outputFields.map((f) => [f, ''])),
    };
    const newIndex = examples.length;
    set('examples', [...examples, blank]);
    setExpandedExamples((prev) => new Set(prev).add(newIndex));
  };

  const removeExample = (i: number) => {
    set('examples', examples.filter((_, idx) => idx !== i));
    setExpandedExamples((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < i) next.add(idx);
        else if (idx > i) next.add(idx - 1);
      });
      return next;
    });
  };

  const toggleExpandExample = (i: number) => {
    setExpandedExamples((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const updateExampleInput = (exIdx: number, field: string, value: string) => {
    const updated = [...examples];
    updated[exIdx] = { ...updated[exIdx], inputs: { ...updated[exIdx].inputs, [field]: value } };
    set('examples', updated);
  };

  const updateExampleOutput = (exIdx: number, field: string, value: string) => {
    const updated = [...examples];
    updated[exIdx] = { ...updated[exIdx], outputs: { ...updated[exIdx].outputs, [field]: value } };
    set('examples', updated);
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="nm-inset rounded-xl p-3 text-[11px] text-blue-400 leading-relaxed">
        DSPy auto-optimizes prompt instructions using your examples. More examples = better performance.
      </div>

      {/* Program Type */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Program Type</p>

      <div className="flex gap-2">
        {PROGRAM_TYPES.map((pt) => (
          <button
            key={pt.id}
            onClick={() => set('program_type', pt.id)}
            className={cn(
              "nm-card rounded-xl p-2.5 flex-1 text-center transition-all",
              programType === pt.id
                ? "border-2 border-purple-500 bg-purple-500/10"
                : "border border-transparent hover:border-white/10"
            )}
          >
            <p className="text-[11px] font-bold text-foreground">{pt.label}</p>
            <p className="text-[10px] text-muted-foreground">{pt.desc}</p>
          </button>
        ))}
      </div>

      <div className="border-t border-white/5" />

      {/* Task Description */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Task</p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Task Description</label>
        <div className="nm-inset rounded-xl px-3 py-2">
          <textarea
            rows={2}
            value={taskDescription}
            onChange={(e) => set('task_description', e.target.value)}
            placeholder="Extract key entities from the provided text"
            className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
          />
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Input Fields */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Fields</p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Input Fields</label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {inputFields.map((field) => (
            <span
              key={field}
              className="nm-inset rounded-lg px-2 py-0.5 text-[11px] flex items-center gap-1 text-foreground"
            >
              {field}
              <button
                onClick={() => removeInputField(field)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="nm-inset rounded-xl flex items-center px-3 h-8">
          <input
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="Add field…"
            value={inputDraft}
            onChange={(e) => setInputDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addInputField();
              }
            }}
          />
        </div>
      </div>

      {/* Output Fields */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Output Fields</label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {outputFields.map((field) => (
            <span
              key={field}
              className="nm-inset rounded-lg px-2 py-0.5 text-[11px] flex items-center gap-1 text-foreground"
            >
              {field}
              <button
                onClick={() => removeOutputField(field)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="nm-inset rounded-xl flex items-center px-3 h-8">
          <input
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="Add field…"
            value={outputDraft}
            onChange={(e) => setOutputDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addOutputField();
              }
            }}
          />
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Training Examples */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Training Examples</p>
        <button
          className="nm-btn rounded-xl px-3 h-8 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
          onClick={addExample}
        >
          + Add Example
        </button>
      </div>

      {examples.length > 0 && (
        <div className="space-y-2">
          {examples.map((example, i) => (
            <div key={i} className="nm-card rounded-xl p-3 space-y-2">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleExpandExample(i)}
                  className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  Example {i + 1}
                </button>
                <button
                  className="nm-btn h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-all"
                  onClick={() => removeExample(i)}
                  title="Delete example"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {expandedExamples.has(i) && (
                <div className="space-y-2 pt-1">
                  <div className="border-t border-white/5" />

                  {/* Input field values */}
                  {inputFields.map((field) => (
                    <div key={`in-${field}`} className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Input: {field}
                      </label>
                      <div className="nm-inset rounded-xl flex items-center px-3 h-9">
                        <input
                          className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                          value={example.inputs[field] ?? ''}
                          placeholder={`Value for ${field}`}
                          onChange={(e) => updateExampleInput(i, field, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Output field values */}
                  {outputFields.map((field) => (
                    <div key={`out-${field}`} className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Output: {field}
                      </label>
                      <div className="nm-inset rounded-xl flex items-center px-3 h-9">
                        <input
                          className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                          value={example.outputs[field] ?? ''}
                          placeholder={`Value for ${field}`}
                          onChange={(e) => updateExampleOutput(i, field, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
            onChange={(e) => set('complexity', Number(e.target.value))}
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
            onChange={(e) => set('temperature', Number(e.target.value))}
            className="flex-1 accent-purple-500"
          />
          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{temperature.toFixed(1)}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70">DSPy prefers deterministic outputs (0.0 recommended)</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Max Tokens</label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="number"
            min={1}
            max={100000}
            value={maxTokens}
            onChange={(e) => set('max_tokens', Number(e.target.value))}
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
