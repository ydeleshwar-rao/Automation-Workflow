"use client";

/**
 * useWorkflowOrchestrator
 * ─────────────────────────────────────────────────────────────
 * Composes the workflow-builder hooks for WorkflowBuilder:
 *   useCurrentUserScope   who is signed in / list query args
 *   useWorkflowSelection  selected workflow, view and execution (page state)
 *   useWorkflowList       sidebar list + create / rename / delete
 *   useWorkflowTags       shared tags (when the admin has tagging on)
 *   useNodePanels         which node is open and which panel shows
 *   useWorkflowCanvas     nodes on the canvas + node edits
 *   useStepNavigator      the step sidebar's Continue (saves each step)
 *   useWorkflowLifecycle  publish / pause / test
 *
 * Server data lives only in the RTK Query cache; this layer holds UI state.
 */

import { useCurrentUserScope } from "./useCurrentUserScope";
import { useNodePanels } from "./useNodePanels";
import { useStepNavigator } from "./useStepNavigator";
import { useWorkflowCanvas } from "./useWorkflowCanvas";
import { useWorkflowLifecycle } from "./useWorkflowLifecycle";
import { useWorkflowList } from "./useWorkflowList";
import { useWorkflowSelection } from "./useWorkflowSelection";
import { useWorkflowTags } from "./useWorkflowTags";

export function useWorkflowOrchestrator() {
  const { userId, isAdmin, ownerQueryArgs } = useCurrentUserScope();
  const selection = useWorkflowSelection();
  const { selectedWorkflowId, selectWorkflow } = selection;

  const workflowList = useWorkflowList({ ownerQueryArgs, userId, selectedWorkflowId, selectWorkflow });
  const { tags, isTagsEnabled } = useWorkflowTags();
  const panels = useNodePanels();
  const canvas = useWorkflowCanvas(selectedWorkflowId, userId, panels);
  const { handleContinue } = useStepNavigator(selectedWorkflowId, userId, canvas, panels);
  const lifecycle = useWorkflowLifecycle(selectedWorkflowId, canvas.nodes, selection.setActiveView);

  return {
    // Canvas
    nodes: canvas.nodes,
    activeNode: canvas.activeNode,
    activeDescriptor: canvas.activeDescriptor,
    events: canvas.events,
    triggerFields: canvas.triggerFields,
    activeStep: panels.activeStep,
    isSelectorOpen: panels.isSelectorOpen,
    isSidebarOpen: panels.isSidebarOpen,

    // Workflow list
    workflows: workflowList.workflows,
    loadWorkflow: selectWorkflow,
    createWorkflow: workflowList.createWorkflow,
    deleteWorkflow: workflowList.deleteWorkflow,
    renameWorkflow: workflowList.renameWorkflow,
    currentWorkflowId: selectedWorkflowId,
    currentWorkflowStatus: workflowList.currentWorkflowStatus,

    // Tags & role
    tags,
    isTagsEnabled,
    isAdmin,

    // View & executions
    activeView: selection.activeView,
    setActiveView: selection.setActiveView,
    activeExecutionId: selection.activeExecutionId,
    setActiveExecutionId: selection.setActiveExecutionId,

    // Lifecycle
    publishWorkflow: lifecycle.publishWorkflow,
    pauseWorkflow: lifecycle.pauseWorkflow,
    testWorkflow: lifecycle.testWorkflow,
    isTesting: lifecycle.isTesting,

    // Node handlers
    setActiveStep: panels.setActiveStep,
    setIsSelectorOpen: panels.setIsSelectorOpen,
    setIsSidebarOpen: panels.setIsSidebarOpen,
    handleNodeClick: canvas.handleNodeClick,
    handleAddAction: canvas.handleAddAction,
    handleDeleteNode: canvas.handleDeleteNode,
    handleDuplicateNode: canvas.handleDuplicateNode,
    handleContinue,
    handleAppSelect: canvas.handleAppSelect,
    handleEventSelect: canvas.handleEventSelect,
    handleUpdateNodeData: canvas.handleUpdateNodeData,
  };
}
