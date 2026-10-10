"use client";

import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { X } from "lucide-react";

// ── Animated gradient edge with delete button ─────────────────────────────────

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
  data,
}: EdgeProps & { data?: { onDelete?: (id: string) => void } }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeId = `gradient-${id}`;

  return (
    <>
      {/* SVG gradient definition */}
      <defs>
        <linearGradient id={edgeId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Glow shadow path (behind) */}
      <path
        d={edgePath}
        fill="none"
        stroke={`url(#${edgeId})`}
        strokeWidth={selected ? 5 : 3}
        strokeOpacity={0.15}
        style={{ filter: "blur(4px)" }}
      />

      {/* Main path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "#8b5cf6" : `url(#${edgeId})`,
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: selected ? "8 4" : undefined,
          animation: selected ? "dash 0.5s linear infinite" : undefined,
        }}
      />

      {/* Delete button on hover/select */}
      {selected && (
        <EdgeLabelRenderer>
          <button
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nm-card w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-all border border-border/40 z-10"
            onClick={(e) => {
              e.stopPropagation();
              data?.onDelete?.(id);
            }}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
