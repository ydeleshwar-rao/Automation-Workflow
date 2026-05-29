"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/src/lib/utils";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import type { AiNodeData } from "@/src/lib/ai-workflow/types";
import { CATEGORY_COLOR, CATEGORY_BG } from "@/src/lib/ai-workflow/types";

// ── Run-status badge ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: AiNodeData["runStatus"] }) {
  if (!status || status === "idle") return null;
  return (
    <div className={cn(
      "absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center z-10",
      status === "running" && "bg-blue-500",
      status === "success" && "bg-green-500",
      status === "error"   && "bg-red-500",
    )}>
      {status === "running" && <Loader2 className="w-3 h-3 text-white animate-spin" />}
      {status === "success" && <CheckCircle2 className="w-3 h-3 text-white" />}
      {status === "error"   && <XCircle className="w-3 h-3 text-white" />}
    </div>
  );
}

// ── BaseNode ──────────────────────────────────────────────────────────────────
// All custom node types delegate rendering here.

export interface BaseNodeProps extends NodeProps {
  data: AiNodeData;
  /** Hide the left (input) handle — trigger nodes don't receive connections */
  hideInput?: boolean;
  /** Hide the right (output) handle — terminal nodes */
  hideOutput?: boolean;
  children?: React.ReactNode;
}

export function BaseNode({
  data,
  selected,
  hideInput = false,
  hideOutput = false,
  children,
}: BaseNodeProps) {
  const color  = CATEGORY_COLOR[data.category];
  const bgTint = CATEGORY_BG[data.category];

  return (
    <div
      className={cn(
        "relative nm-card rounded-2xl min-w-[180px] max-w-[220px] transition-all duration-150",
        selected && "outline outline-2 outline-offset-2",
      )}
      style={{
        outlineColor: selected ? color : undefined,
      }}
    >
      <StatusBadge status={data.runStatus} />

      {/* Coloured left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: color }}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 pt-3 pb-2.5 pl-4"
        style={{ background: bgTint, borderRadius: "1rem 1rem 0 0" }}
      >
        {/* Icon badge */}
        <div
          className="nm-inset w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
          style={{ border: `1px solid ${color}30` }}
        >
          <span style={{ filter: "none" }}>{data.icon}</span>
        </div>
        <div className="flex flex-col gap-0 flex-1 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color }}>
            {data.category}
          </span>
          <span className="text-[13px] font-bold text-foreground leading-tight truncate">
            {data.label}
          </span>
        </div>
      </div>

      {/* Description */}
      {data.description && (
        <div className="px-4 pt-1.5 pb-2.5">
          <p className="text-[11.5px] text-muted-foreground leading-snug">
            {data.description}
          </p>
        </div>
      )}

      {/* Optional slot for extra node body content */}
      {children && (
        <div className="px-3 pb-3">{children}</div>
      )}

      {/* Handles */}
      {!hideInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !rounded-full !border-2 !border-white"
          style={{ background: color, left: -6 }}
        />
      )}
      {!hideOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !rounded-full !border-2 !border-white"
          style={{ background: color, right: -6 }}
        />
      )}
    </div>
  );
}
