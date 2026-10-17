"use client";

/**
 * WorkflowBuilder
 * ─────────────────────────────────────────────────────────────
 * Layout:
 *  ┌──────────────────────────────────────────────────────┐
 *  │  ☰  Workflow Name  │ ● Active ‖ Paused │ Test │ Publish │
 *  ├──────────┬───────────────────────────────────────────┤
 *  │ SIDEBAR  │  [Builder] [Monitor]  tabs                │
 *  │ (toggle) │  ─────────────────────────────────────    │
 *  │          │  canvas / execution list                  │
 *  └──────────┴───────────────────────────────────────────┘
 *
 * State and backend sync live in useWorkflowOrchestrator; this file only lays out the page.
 */

import React, { useEffect, useState } from "react";
import { useWorkflowOrchestrator } from "./uiOrchestrator/useWorkflowOrchestrator";
import { useStepContext } from "./uiOrchestrator/useStepContext";
import type { StepFooterConfig } from "./uiOrchestrator/types";
import type { ConfigStep } from "./components/event-sidebar/eventSidebar";
import { WorkflowCanvasView } from "./components/WorkflowCanvasView";
import { EventSelector } from "./components/eventSelector";
import { EventSidebar } from "./components/event-sidebar/eventSidebar";
import { IntegrationStepRenderer } from "./components/integrationStepRenderer";
import { WorkflowListSidebar } from "./components/event-sidebar/WorkflowListSidebar";
import WorkflowNavbar from "./components/workflowNavbar";
import { CreateWorkflowNameModal } from "./components/CreateWorkflowNameModal";
import { StepFooter } from "./components/builder/StepFooter";
import { MonitorView } from "./components/builder/MonitorView";
import { CANVAS_BACKGROUND_CLASS, NoWorkflowSelected } from "./components/builder/BuilderPlaceholders";
import { useCollapsibleSidebar } from "./components/builder/useCollapsibleSidebar";

export function WorkflowBuilder() {
  const workflow = useWorkflowOrchestrator();
  const {
    nodes,
    activeNode,
    activeDescriptor,
    activeStep,
    currentWorkflowId,
    activeView,
    tags,
    isTagsEnabled,
    createWorkflow,
    setIsSelectorOpen,
    setIsSidebarOpen,
    handleContinue,
  } = workflow;

  const stepContext = useStepContext({
    nodes,
    activeNode,
    events: workflow.events,
    triggerFields: workflow.triggerFields,
    workflowId: currentWorkflowId,
    handleEventSelect: workflow.handleEventSelect,
    handleUpdateNodeData: workflow.handleUpdateNodeData,
    handleContinue,
    setIsSidebarOpen,
    setIsSelectorOpen,
  });

  const workflowSidebar = useCollapsibleSidebar();
  const [footerConfig, setFooterConfig] = useState<StepFooterConfig | null>(null);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);

  // Clear the footer only when switching nodes: the step renderer's effect runs first (child
  // before parent), so clearing on step changes would wipe the footer it just set.
  useEffect(() => {
    setFooterConfig(null);
  }, [activeNode?.id]);

  const createWorkflowWithName = async (workflowName: string, tagIds: string[]) => {
    setIsCreatingWorkflow(true);
    try {
      await createWorkflow(workflowName, tagIds);
      setIsNameModalOpen(false);
    } finally {
      setIsCreatingWorkflow(false);
    }
  };

  const renderStep = (step: ConfigStep) =>
    stepContext ? (
      <IntegrationStepRenderer descriptor={activeDescriptor} step={step} context={stepContext} onUpdateFooter={setFooterConfig} />
    ) : null;

  return (
    <div className="nm-soft flex h-full w-full min-h-0 flex-col gap-1.5 bg-[hsl(var(--surface))] p-1.5">
      <WorkflowNavbar
        workflows={workflow.workflows}
        currentWorkflowId={currentWorkflowId}
        setActiveView={workflow.setActiveView}
        activeView={activeView}
        publishWorkflow={workflow.publishWorkflow}
        pauseWorkflow={workflow.pauseWorkflow}
        currentWorkflowStatus={workflow.currentWorkflowStatus}
        testWorkflow={workflow.testWorkflow}
        isTesting={workflow.isTesting}
      />

      <div className="nm-card flex min-h-0 flex-1 overflow-hidden rounded-xl">
        <WorkflowListSidebar
          isOpen={workflowSidebar.isOpen}
          isPinned={workflowSidebar.isPinned}
          workflows={workflow.workflows}
          currentWorkflowId={currentWorkflowId}
          isAdmin={workflow.isAdmin}
          tags={tags}
          onCreate={() => setIsNameModalOpen(true)}
          onCreateWithName={() => setIsNameModalOpen(true)}
          onSelect={workflow.loadWorkflow}
          onDelete={workflow.deleteWorkflow}
          onRename={workflow.renameWorkflow}
          onTogglePinned={workflowSidebar.togglePinned}
          onExpandHover={workflowSidebar.expandOnHover}
          onCollapseHover={workflowSidebar.collapseOnLeave}
        />

        <div className="flex flex-1 overflow-hidden">
          {activeView === "builder" && !currentWorkflowId && <NoWorkflowSelected />}

          {activeView === "builder" && currentWorkflowId && (
            <div className={`flex-1 relative overflow-hidden ${CANVAS_BACKGROUND_CLASS}`}>
              <WorkflowCanvasView
                nodes={nodes}
                activeNodeId={activeNode?.id ?? null}
                isSidebarOpen={workflow.isSidebarOpen}
                onNodeClick={workflow.handleNodeClick}
                onDeleteNode={workflow.handleDeleteNode}
                onDuplicateNode={workflow.handleDuplicateNode}
                onAddAction={workflow.handleAddAction}
              />

              <EventSelector
                isOpen={workflow.isSelectorOpen}
                onClose={() => setIsSelectorOpen(false)}
                onSelect={(app) => {
                  if (activeNode?.id) workflow.handleAppSelect(activeNode.id, app);
                }}
              />

              <EventSidebar
                isOpen={workflow.isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isLoading={false}
                selectedApp={
                  activeNode
                    ? { label: activeNode.appLabel || "", icon: activeNode.appIcon, color: activeNode.appColor || "" }
                    : undefined
                }
                title={activeNode?.appLabel}
                nodeIndex={activeNode?.index}
                isTrigger={activeNode?.type === "trigger"}
                activeStep={activeStep}
                onStepChange={workflow.setActiveStep}
                renderSetup={() => renderStep("setup")}
                renderConfigure={() => renderStep("configure")}
                renderTest={() => renderStep("test")}
                footer={
                  <StepFooter
                    footerConfig={footerConfig}
                    isAwaitingEventSelection={activeStep === "setup" && !activeNode?.eventLabel}
                    onContinue={handleContinue}
                  />
                }
              />
            </div>
          )}

          {activeView === "monitor" && (
            <MonitorView
              workflowId={currentWorkflowId}
              activeExecutionId={workflow.activeExecutionId}
              onSelectExecution={workflow.setActiveExecutionId}
            />
          )}
        </div>
      </div>

      <CreateWorkflowNameModal
        isOpen={isNameModalOpen}
        onClose={() => setIsNameModalOpen(false)}
        onCreate={createWorkflowWithName}
        isLoading={isCreatingWorkflow}
        availableTags={tags}
        isTagsEnabled={isTagsEnabled}
      />
    </div>
  );
}
