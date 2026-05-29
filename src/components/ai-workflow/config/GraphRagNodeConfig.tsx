"use client";
import React from "react";
import { cn } from "@/src/lib/utils";

interface Props {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function GraphRagNodeConfig({ config, onChange }: Props) {
  const set = (key: string, val: unknown) => onChange({ ...config, [key]: val });

  const systemPrompt = (config.system_prompt as string) ?? "";
  const chunkSize    = (config.chunk_size as number) ?? 512;
  const topK         = (config.top_k as number) ?? 5;
  const hopDepth     = (config.hop_depth as number) ?? 2;
  const complexity   = (config.complexity as number) ?? 7;
  const temperature  = (config.temperature as number) ?? 0.3;
  const maxTokens    = (config.max_tokens as number) ?? 2000;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="nm-inset rounded-xl p-3 text-[11px] text-blue-400 leading-relaxed">
        Graph RAG surfaces related chunks via entity relationships — even those missed by semantic similarity alone.
      </div>

      {/* Context */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Context</p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">System Prompt</label>
        <div className="nm-inset rounded-xl px-3 py-2">
          <textarea
            rows={3}
            value={systemPrompt}
            onChange={(e) => set("system_prompt", e.target.value)}
            placeholder="Answer using only the provided context."
            className="w-full bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
          />
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* Retrieval */}
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Retrieval</p>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Chunk Size</label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="number"
            min={100}
            max={4000}
            step={100}
            value={chunkSize}
            onChange={(e) => set("chunk_size", Number(e.target.value))}
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <p className="text-[10px] text-muted-foreground/70">Characters per document chunk</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Top K Results</label>
        <div className="nm-inset rounded-xl flex items-center px-3 h-9">
          <input
            type="number"
            min={1}
            max={20}
            value={topK}
            onChange={(e) => set("top_k", Number(e.target.value))}
            className="flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <p className="text-[10px] text-muted-foreground/70">Chunks retrieved per query</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Entity Hop Depth</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={4}
            step={1}
            value={hopDepth}
            onChange={(e) => set("hop_depth", Number(e.target.value))}
            className="flex-1 accent-purple-500"
          />
          <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{hopDepth}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70">How many relationship hops to traverse from seed chunks (higher = broader but slower)</p>
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
