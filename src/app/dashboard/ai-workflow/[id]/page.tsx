"use client";

import React from "react";
import { useParams } from "next/navigation";
import { WorkflowCanvas } from "@/src/components/ai-workflow/WorkflowCanvas";
import { useGetAiWorkflowQuery, useUpdateAiWorkflowMutation, useRunAiWorkflowMutation } from "@/src/components/ai-workflow/aiWorkflowApi";
import type { Node, Edge, Viewport } from "@xyflow/react";
import type { AiNodeData } from "@/src/lib/ai-workflow/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AiWorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useGetAiWorkflowQuery(id);
  const [updateWf, { isLoading: isSaving }]  = useUpdateAiWorkflowMutation();
  const [runWf,    { isLoading: isRunning }]  = useRunAiWorkflowMutation();

  const workflow  = data?.data;
  const listItem  = workflow
    ? { id: workflow.id, name: workflow.name, description: workflow.description, status: workflow.status, created_at: workflow.created_at, updated_at: workflow.updated_at }
    : undefined;

  const handleSave = async (
    nodes: Node<AiNodeData>[],
    edges: Edge[],
    viewport: Viewport
  ) => {
    try {
      await updateWf({ id, patch: { nodes: nodes as any, edges: edges as any, viewport } }).unwrap();
      toast.success("Workflow saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleRun = async () => {
    try {
      await runWf(id).unwrap();
      toast.success("Execution started");
    } catch {
      toast.error("Failed to start execution");
    }
  };

  const handleNameChange = async (name: string) => {
    try {
      await updateWf({ id, patch: { name } }).unwrap();
    } catch {
      toast.error("Failed to rename workflow");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[hsl(var(--surface))]">
        <div className="nm-card rounded-2xl px-8 py-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-[13px] font-semibold text-foreground">Loading canvas…</span>
        </div>
      </div>
    );
  }

  return (
    <WorkflowCanvas
      workflowId={id}
      workflow={listItem}
      initialNodes={(workflow?.nodes ?? []) as Node<AiNodeData>[]}
      initialEdges={(workflow?.edges ?? []) as Edge[]}
      isSaving={isSaving}
      isRunning={isRunning}
      onSave={handleSave}
      onRun={handleRun}
      onNameChange={handleNameChange}
    />
  );
}
