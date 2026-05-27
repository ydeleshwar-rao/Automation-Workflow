"use client";

import React from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { TriggerNode } from "./trigger";
import { ActionNode } from "./action";
import { Connector } from "./addEventsConnector";
import { WorkflowNodeData } from "../uiOrchestrator/types";

interface Props {
  nodes: WorkflowNodeData[];
  activeNodeId: string | null;
  isSidebarOpen: boolean;
  onNodeClick: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onAddAction: (index: number) => void;
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

export function WorkflowCanvasView({
  nodes,
  activeNodeId,
  isSidebarOpen,
  onNodeClick,
  onDeleteNode,
  onDuplicateNode,
  onAddAction,
}: Props) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);
  const panStateRef = React.useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const resetView = React.useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomIn = () => setZoom((z) => clampZoom(parseFloat((z + ZOOM_STEP).toFixed(2))));
  const zoomOut = () => setZoom((z) => clampZoom(parseFloat((z - ZOOM_STEP).toFixed(2))));

  // Wheel: ctrl/meta = zoom around cursor, otherwise vertical pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const delta = -e.deltaY * 0.0015;
      const next = clampZoom(parseFloat((zoom * (1 + delta)).toFixed(3)));
      const ratio = next / zoom;
      setOffset((o) => ({
        x: cx - (cx - o.x) * ratio,
        y: cy - (cy - o.y) * ratio,
      }));
      setZoom(next);
    } else {
      setOffset((o) => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan when starting drag from blank canvas (not a node)
    if ((e.target as HTMLElement).closest("[data-node-card]")) return;
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    setIsPanning(true);
    panStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  React.useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: MouseEvent) => {
      const s = panStateRef.current;
      if (!s) return;
      setOffset({
        x: s.originX + (e.clientX - s.startX),
        y: s.originY + (e.clientY - s.startY),
      });
    };
    const onUp = () => {
      setIsPanning(false);
      panStateRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning]);

  // Reset view when sidebar opens/closes so the layout re-centres
  React.useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [isSidebarOpen]);

  const zoomPct = Math.round(zoom * 100);

  return (
    <div
      ref={viewportRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute inset-0 overflow-hidden select-none transition-[padding] duration-300",
        isSidebarOpen ? "pr-[450px]" : "pr-0",
        isPanning ? "cursor-grabbing" : "cursor-grab",
      )}
    >
      {/* Transformable stage centred in the viewport */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isPanning ? "none" : "transform 120ms ease-out",
          willChange: "transform",
        }}
      >
        <div className="flex flex-col items-center w-full max-w-2xl py-12">
          {nodes.map((node, idx) => (
            <React.Fragment key={node.id}>
              <div data-node-card>
                {node.type === "trigger" ? (
                  <TriggerNode
                    {...node}
                    isActive={activeNodeId === node.id}
                    onClick={() => onNodeClick(node.id)}
                    onDelete={() => onDeleteNode(node.id)}
                    onDuplicate={() => onDuplicateNode(node.id)}
                  />
                ) : (
                  <ActionNode
                    {...node}
                    isActive={activeNodeId === node.id}
                    onClick={() => onNodeClick(node.id)}
                    onDelete={() => onDeleteNode(node.id)}
                    onDuplicate={() => onDuplicateNode(node.id)}
                  />
                )}
              </div>
              <div data-node-card>
                <Connector onClick={() => onAddAction(idx + 1)} />
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Zoom / Pan controls — bottom-right, neumorphic */}
      <div
        className={cn(
          "absolute bottom-4 z-20 flex items-center gap-0.5 rounded-xl nm-card p-1 transition-[right] duration-300",
          isSidebarOpen ? "right-[466px]" : "right-4",
        )}
      >
        <button
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={resetView}
          aria-label={`Zoom level ${zoomPct}% — click to reset`}
          className="min-w-[52px] rounded-lg px-2 py-1 text-xs font-semibold tabular-nums text-foreground transition-all hover:bg-muted"
        >
          {zoomPct}%
        </button>
        <button
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="mx-1 h-5 w-px bg-border/50" />
        <button
          onClick={resetView}
          aria-label="Fit to screen"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          onClick={resetView}
          aria-label="Reset view"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
