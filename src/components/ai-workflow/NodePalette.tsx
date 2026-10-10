"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Info, Search } from "lucide-react";
import { cn } from "@/src/lib/utils";
import {
  CATALOG_BY_CATEGORY,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  type NodeDefinition,
} from "@/src/lib/ai-workflow/node-catalog";
import { CATEGORY_COLOR, type NodeCategory } from "@/src/lib/ai-workflow/types";

// ── Category order in the palette ────────────────────────────────────────────
const CATEGORY_ORDER: NodeCategory[] = [
  "trigger", "ai", "action", "logic", "transform", "code",
];

// ── DraggableNodeCard ─────────────────────────────────────────────────────────
function DraggableNodeCard({ def }: { def: NodeDefinition }) {
  const color = CATEGORY_COLOR[def.category];

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/ai-workflow-node",
      JSON.stringify(def)
    );
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-all border border-transparent hover:border-foreground/15 hover:bg-card group"
    >
      {/* Icon badge */}
      <div
        className="w-7 h-7 rounded-md border border-foreground/15 bg-background flex items-center justify-center text-xs shrink-0 font-semibold"
        style={{ borderLeft: `2px solid ${color}50`, color }}
      >
        {def.icon}
      </div>
      <div className="flex flex-col gap-0 flex-1 min-w-0">
        <span className="text-[12.5px] font-medium text-foreground leading-tight truncate">
          {def.label}
        </span>
        <span className="text-[10.5px] text-muted-foreground leading-snug truncate">
          {def.description}
        </span>
        {def.hint && (
          <span className="mt-1 flex items-start gap-1 text-[10px] text-muted-foreground/80 leading-snug line-clamp-2">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{def.hint}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ── CategorySection ───────────────────────────────────────────────────────────
function CategorySection({
  category,
  nodes,
}: {
  category: NodeCategory;
  nodes: NodeDefinition[];
}) {
  const [open, setOpen] = useState(category === "trigger" || category === "ai");
  const color = CATEGORY_COLOR[category];

  return (
    <div className="border-b border-foreground/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-card/70 transition-colors"
      >
        <div
          className="w-6 h-6 rounded-md border border-foreground/15 bg-background flex items-center justify-center text-sm shrink-0"
          style={{ borderLeft: `2px solid ${color}` }}
        >
          <span>{CATEGORY_EMOJIS[category]}</span>
        </div>
        <span className="text-[12px] font-semibold text-foreground flex-1 text-left">
          {CATEGORY_LABELS[category]}
        </span>
        <span className="text-[10px] text-muted-foreground mr-1">{nodes.length}</span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        }
      </button>

      {open && (
        <div className="px-2 pb-2 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {nodes.map((def) => (
            <DraggableNodeCard key={def.nodeType} def={def} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── NodePalette ───────────────────────────────────────────────────────────────
export function NodePalette() {
  const [search, setSearch] = useState("");

  // Search across all categories
  const searchResults: NodeDefinition[] = search.trim()
    ? CATEGORY_ORDER.flatMap((cat) =>
        CATALOG_BY_CATEGORY[cat].filter(
          (n) =>
            n.label.toLowerCase().includes(search.toLowerCase()) ||
            n.description.toLowerCase().includes(search.toLowerCase())
        )
      )
    : [];

  return (
    <aside className="w-[240px] flex flex-col h-full bg-[hsl(var(--surface))] border-r border-foreground/15 shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-foreground/10 shrink-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
          Node Palette
        </p>
        {/* Search */}
        <div className="rounded-lg border border-foreground/25 bg-card flex items-center gap-2 px-2.5 h-8 shadow-sm">
          <Search className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <input
            placeholder="Search nodes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none font-medium"
          />
        </div>
      </div>

      {/* Drag hint */}
      <div className="px-3 py-2 shrink-0">
        <p className="text-[10px] text-muted-foreground text-center">
          ✋ Drag nodes onto the canvas
        </p>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {search.trim() ? (
          // Flat search results
          <div className="px-2 py-1 space-y-0.5">
            {searchResults.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground">No nodes match "{search}"</p>
              </div>
            ) : (
              searchResults.map((def) => (
                <DraggableNodeCard key={def.nodeType} def={def} />
              ))
            )}
          </div>
        ) : (
          // Categorised sections
          CATEGORY_ORDER.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              nodes={CATALOG_BY_CATEGORY[cat]}
            />
          ))
        )}
      </div>
    </aside>
  );
}
