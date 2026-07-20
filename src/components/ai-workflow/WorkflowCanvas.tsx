"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type Viewport,
  type OnNodesChange,
  type OnEdgesChange,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes }   from "./nodes/nodeTypes";
import { FlowEdge }    from "./edges/FlowEdge";
import { NodePalette } from "./NodePalette";
import { CanvasToolbar } from "./CanvasToolbar";
import { ConfigPanel }   from "./ConfigPanel";
import { HarnessTestPanel } from "./HarnessTestPanel";

import type { AiNodeData, AiWorkflowListItem } from "@/src/lib/ai-workflow/types";
import type { NodeDefinition } from "@/src/lib/ai-workflow/node-catalog";
import { cn } from "@/src/lib/utils";
import { Plus } from "lucide-react";

// ── Edge types ────────────────────────────────────────────────────────────────
const edgeTypes = { default: FlowEdge };

// ── Default welcome nodes ─────────────────────────────────────────────────────
function buildDefaultNodes(): Node<AiNodeData>[] {
  return [
    {
      id:       "trigger-1",
      type:     "trigger",
      position: { x: 120, y: 240 },
      data: {
        label:       "Manual Trigger",
        description: "Click Run to start",
        category:    "trigger",
        nodeType:    "manual-trigger",
        icon:        "⚡",
        config:      {},
        runStatus:   "idle",
      },
    },
  ];
}

// ── WorkflowCanvas ────────────────────────────────────────────────────────────
interface WorkflowCanvasProps {
  workflowId: string;
  workflow:   AiWorkflowListItem | undefined;
  initialNodes: Node<AiNodeData>[];
  initialEdges: Edge[];
  isSaving:  boolean;
  isRunning: boolean;
  onSave: (nodes: Node<AiNodeData>[], edges: Edge[], viewport: Viewport) => void;
  onRun:  () => void;
  onNameChange: (name: string) => void;
}

export function WorkflowCanvas({
  workflow,
  initialNodes,
  initialEdges,
  isSaving,
  isRunning,
  onSave,
  onRun,
  onNameChange,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange]    = useNodesState<Node<AiNodeData>>(
    initialNodes.length > 0 ? initialNodes : buildDefaultNodes()
  );
  const [edges, setEdges, onEdgesChange]    = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode]     = useState<Node<AiNodeData> | null>(null);
  const [reactFlowInstance, setInstance]    = useState<any>(null);
  const [isHarnessOpen, setHarnessOpen]     = useState(false);

  // ── Connect nodes ──────────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "default",
            data: { onDelete: handleEdgeDelete },
            animated: true,
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const handleEdgeDelete = useCallback(
    (edgeId: string) => setEdges((eds) => eds.filter((e) => e.id !== edgeId)),
    [setEdges]
  );

  // ── Drop from palette ──────────────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/ai-workflow-node");
      if (!raw || !reactFlowInstance) return;

      const def: NodeDefinition = JSON.parse(raw);
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      const newNode: Node<AiNodeData> = {
        id:   `${def.nodeType}-${Date.now()}`,
        type: def.category,
        position,
        data: {
          label:       def.label,
          description: def.description,
          category:    def.category,
          nodeType:    def.nodeType,
          icon:        def.icon,
          config:      { ...def.defaultConfig },
          runStatus:   "idle",
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // ── Node click → open config ───────────────────────────────
  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node<AiNodeData>) =>
      setSelectedNode(node),
    []
  );

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  // ── Config panel update ────────────────────────────────────
  const handleNodeUpdate = (nodeId: string, patch: Partial<AiNodeData>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
      )
    );
    setSelectedNode((prev) =>
      prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...patch } } : prev
    );
  };

  const handleNodeDelete = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  // ── Save ───────────────────────────────────────────────────
  const handleSave = () => {
    const viewport: Viewport = reactFlowInstance?.getViewport() ?? { x: 0, y: 0, zoom: 1 };
    onSave(nodes, edges, viewport);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Toolbar */}
      <CanvasToolbar
        workflow={workflow}
        isSaving={isSaving}
        isRunning={isRunning}
        onSave={handleSave}
        onRun={onRun}
        onOpenHarnessTest={() => setHarnessOpen(true)}
        onNameChange={onNameChange}
      />

      {/* Canvas + panels */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Node palette (left) */}
        <NodePalette />

        {/* React Flow canvas */}
        <div
          ref={reactFlowWrapper}
          className="flex-1 h-full relative"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange as OnNodesChange}
            onEdgesChange={onEdgesChange as OnEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick as any}
            onPaneClick={onPaneClick}
            onInit={setInstance}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode="Delete"
            multiSelectionKeyCode="Shift"
            panOnDrag
            selectionOnDrag={false}
            minZoom={0.2}
            maxZoom={2}
            defaultEdgeOptions={{ type: "default", animated: true }}
            style={{ background: "hsl(var(--surface))" }}
          >
            {/* Dot-grid background */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.5}
              color="hsl(var(--muted-foreground) / 20%)"
            />

            {/* Zoom controls */}
            <Controls
              className="!nm-card !rounded-xl !border-0 !shadow-none overflow-hidden"
              showInteractive={false}
            />

            {/* Minimap */}
            <MiniMap
              className="!nm-card !rounded-xl !border-0 !shadow-none"
              nodeColor={(n) => {
                const nd = n as Node<AiNodeData>;
                return nd.data?.category
                  ? `${CATEGORY_COLOR_MAP[nd.data.category]}80`
                  : "#8b5cf680";
              }}
            />

            {/* Empty state hint */}
            {nodes.length <= 1 && (
              <Panel position="top-center">
                <div className="nm-inset rounded-2xl px-5 py-3 flex items-center gap-2 mt-4 text-[12px] text-muted-foreground font-medium">
                  <Plus className="w-4 h-4" />
                  Drag nodes from the left panel — connect them to build your AI flow
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Config panel (right) */}
        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onUpdate={handleNodeUpdate}
            onDelete={handleNodeDelete}
          />
        )}

        {isHarnessOpen && (
          <HarnessTestPanel
            workflow={workflow}
            nodes={nodes}
            edges={edges}
            onClose={() => setHarnessOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// colour lookup used by minimap (duplicate from types to avoid import in style attr)
const CATEGORY_COLOR_MAP: Record<string, string> = {
  trigger:   "#f97316",
  ai:        "#8b5cf6",
  action:    "#22c55e",
  logic:     "#eab308",
  transform: "#3b82f6",
  code:      "#6b7280",
};
