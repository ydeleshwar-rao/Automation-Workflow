"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import type { Node } from "@xyflow/react";
import type { AiNodeData } from "@/src/lib/ai-workflow/types";
import { CATEGORY_COLOR } from "@/src/lib/ai-workflow/types";
import { cn } from "@/src/lib/utils";
import { ConfigPanelRouter } from "./config/ConfigPanelRouter";

interface ConfigPanelProps {
  node: Node<AiNodeData> | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<AiNodeData>) => void;
  onDelete: (nodeId: string) => void;
}

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

  const color = CATEGORY_COLOR[node.data.category];

  const apply = () => {
    onUpdate(node.id, { label: localLabel, config: localConfig });
  };

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

        <ConfigPanelRouter
          nodeType={node.data.nodeType}
          config={localConfig}
          onChange={setLocalConfig}
        />
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-black/8 dark:border-white/5 flex items-center gap-2 shrink-0">
        <button
          onClick={apply}
          className={cn(
            "flex-1 h-9 rounded-xl text-[12px] font-bold text-primary-foreground transition-all",
            "bg-primary shadow-[3px_3px_8px_rgba(99,102,241,0.4),-2px_-2px_6px_rgba(255,255,255,0.1)]",
            "hover:bg-primary/90"
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
