
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
 */

import React from "react";
import dynamic from "next/dynamic";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import {
  Zap,
  Activity,
} from "lucide-react";

import { useWorkflowOrchestrator } from "./uiOrchestrator/useWorkflowOrchestrator";
import { WorkflowCanvasView } from "./components/WorkflowCanvasView";
import { EventSelector } from "./components/eventSelector";
import { EventSidebar } from "./components/event-sidebar/eventSidebar";
import { IntegrationStepRenderer } from "./components/integrationStepRenderer";
import { WorkflowListSidebar } from "./components/event-sidebar/WorkflowListSidebar";
import WorkflowNavbar from "./components/workflowNavbar";
import { CreateWorkflowNameModal } from "./components/CreateWorkflowNameModal";

const MonitorPaneFallback = () => (
  <div className="flex flex-1 items-center justify-center bg-muted/30">
    <div className="h-10 w-10 rounded-full border-2 border-border border-t-primary animate-spin" />
  </div>
);

const ExecutionList = dynamic(
  () =>
    import("./components/ExecutionMonitor/ExecutionList").then(
      (m) => m.ExecutionList,
    ),
  { ssr: false, loading: () => <MonitorPaneFallback /> },
);

const ExecutionDetail = dynamic(
  () =>
    import("./components/ExecutionMonitor/ExecutionDetail").then(
      (m) => m.ExecutionDetail,
    ),
  { ssr: false, loading: () => <MonitorPaneFallback /> },
);

export function WorkflowBuilder() {
  const workflow = useWorkflowOrchestrator();

  const {
    nodes,
    activeNode,
    activeDescriptor,
    events,
    activeStep,
    isSelectorOpen,
    isSidebarOpen,
    workflows,
    currentWorkflowId,
    currentWorkflowStatus,
    activeView,
    activeExecutionId,

    // Tags & Role
    tags,
    createTag,
    isAdmin,

    // Actions
    setActiveStep,
    setIsSelectorOpen,
    setIsSidebarOpen,
    setActiveView,
    setActiveExecutionId,
    createWorkflow,
    loadWorkflow,
    deleteWorkflow,
    renameWorkflow,
    publishWorkflow,
    pauseWorkflow,
    testWorkflow,
    isTesting,

    // Node handlers
    handleNodeClick,
    handleAddAction,
    handleDeleteNode,
    handleDuplicateNode,
    handleContinue,
    handleAppSelect,
    handleEventSelect,
    handleUpdateNodeData,
    triggerFields,
  } = workflow;

  const [dynamicFooter, setDynamicFooter] = React.useState<any>(null);
  const [navOpen, setNavOpen] = React.useState(true);
  const [isSidebarPinned, setIsSidebarPinned] = React.useState(true);
  const [isNameModalOpen, setIsNameModalOpen] = React.useState(false);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = React.useState(false);

  const handleCreateWithCustomName = async (workflowName: string, tagIds: string[]) => {
    setIsCreatingWorkflow(true);
    try {
      await createWorkflow(workflowName, tagIds);
      setIsNameModalOpen(false);
    } finally {
      setIsCreatingWorkflow(false);
    }
  };

  // Clear stale footer only when switching nodes. Don't clear on activeStep
  // changes — the integration's IntegrationStepRenderer effect runs as a child
  // (post-order), so a parent clearing effect would fire after it and clobber
  // the freshly set footer (e.g. test-controls), making the Test trigger button
  // disappear from the test step.
  React.useEffect(() => {
    setDynamicFooter(null);
  }, [activeNode?.id]);

  const triggerNode = nodes.find((n) => n.type === "trigger");
  const triggerWebhookId =
    triggerNode?.config?.webhook?.id ?? triggerNode?.config?.webhook_id;
  /**
   * Webhook trigger Test tab: `webhook/index.ts` handleSelectRequest → onFormDataChange({ testPayload: request.data })
   * → handleUpdateNodeData merges into trigger `config`. Prefer camelCase; some APIs may send `test_payload`.
   */
  const triggerCfg = triggerNode?.config;
  const triggerTestPayload =
    triggerCfg?.testPayload ??
    triggerCfg?.test_payload ??
    triggerNode?.sample_payload;
  const triggerTestSamples: unknown[] | undefined = Array.isArray(triggerCfg?.testSamples)
    ? (triggerCfg!.testSamples as unknown[])
    : undefined;
  const triggerNodeId = triggerNode?.id;

  const stepContext = {
    node: {
      ...(activeNode ?? ({} as any)),
      // Ensure workflowId is always available on the node for integrations
      workflowId: activeNode?.workflowId ?? currentWorkflowId,
    },
    events,
    selectedEvent: activeNode?.eventLabel ?? null,
    onEventSelect: (event: string) => {
      if (activeNode?.id) handleEventSelect(activeNode.id, event);
    },
    onChangeApp: () => {
      setIsSidebarOpen(false);
      // Small delay to let the sidebar unmount before opening the selector
      setTimeout(() => setIsSelectorOpen(true), 100);
    },
    isTrigger: activeNode?.type === "trigger",
    onSkipTest: handleContinue,
    onFormDataChange: (data: Record<string, any>) => {
      if (activeNode?.id) handleUpdateNodeData(activeNode.id, data);
    },
    triggerFields,
    triggerWebhookId,
    triggerTestPayload,
    triggerTestSamples,
    triggerNodeId,
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-1 bg-[hsl(var(--surface))] p-1">

      {/* ════════════════════════════════════════════════════
          TOP BAR
          ════════════════════════════════════════════════════ */}
      <WorkflowNavbar
        workflows={workflows}
        currentWorkflowId={currentWorkflowId}
        setActiveView={setActiveView}
        activeView={activeView}
        publishWorkflow={publishWorkflow}
        pauseWorkflow={pauseWorkflow}
        currentWorkflowStatus={currentWorkflowStatus}
        testWorkflow={testWorkflow}
        isTesting={isTesting}
      />



      {/* ════════════════════════════════════════════════════
          BODY — sidebar + main area
          ════════════════════════════════════════════════════ */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]">

        {/* Workflow list sidebar */}
        <WorkflowListSidebar
          isOpen={navOpen}
          isPinned={isSidebarPinned}
          workflows={workflows}
          currentWorkflowId={currentWorkflowId}
          isAdmin={isAdmin}
          tags={tags}
          onCreate={() => setIsNameModalOpen(true)}
          onCreateWithName={() => setIsNameModalOpen(true)}
          onSelect={loadWorkflow}
          onDelete={deleteWorkflow}
          onRename={renameWorkflow}
          onTogglePinned={() => {
            if (isSidebarPinned) {
              setIsSidebarPinned(false);
              setNavOpen(false);
              return;
            }
            setIsSidebarPinned(true);
            setNavOpen(true);
          }}
          onExpandHover={() => {
            if (!isSidebarPinned) setNavOpen(true);
          }}
          onCollapseHover={() => {
            if (!isSidebarPinned) setNavOpen(false);
          }}
        />

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── BUILDER VIEW – empty state ── */}
          {activeView === "builder" && !currentWorkflowId && (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-muted/30 [background-image:radial-gradient(hsl(var(--foreground)/0.12)_1px,transparent_1px)] [background-size:20px_20px]">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center">
                <Zap className="h-9 w-9 text-primary/60" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">No workflow selected</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Create a new workflow or pick one from the sidebar to start building.
                </p>
              </div>
            </div>
          )}

          {/* ── BUILDER VIEW – canvas ── */}
          {activeView === "builder" && currentWorkflowId && (
            <div className="flex-1 relative overflow-hidden bg-muted/30 [background-image:radial-gradient(hsl(var(--foreground)/0.12)_1px,transparent_1px)] [background-size:20px_20px]">
              <WorkflowCanvasView
                nodes={nodes}
                activeNodeId={activeNode?.id ?? null}
                isSidebarOpen={isSidebarOpen}
                onNodeClick={handleNodeClick}
                onDeleteNode={handleDeleteNode}
                onDuplicateNode={handleDuplicateNode}
                onAddAction={handleAddAction}
              />

              <EventSelector
                isOpen={isSelectorOpen}
                onClose={() => setIsSelectorOpen(false)}
                onSelect={(app) => {
                  if (activeNode?.id) {
                    handleAppSelect(activeNode.id, app);
                  }
                }}
              />

              <EventSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isLoading={false}
                selectedApp={
                  activeNode
                    ? {
                      label: activeNode.appLabel || "",
                      icon: activeNode.appIcon,
                      color: activeNode.appColor || "",
                    }
                    : undefined
                }
                title={activeNode?.appLabel}
                nodeIndex={activeNode?.index}
                isTrigger={activeNode?.type === "trigger"}
                activeStep={activeStep}
                onStepChange={setActiveStep}
                renderSetup={() => (
                  <IntegrationStepRenderer
                    descriptor={activeDescriptor}
                    step="setup"
                    context={stepContext}
                    onUpdateFooter={setDynamicFooter}
                  />
                )}
                renderConfigure={() => (
                  <IntegrationStepRenderer
                    descriptor={activeDescriptor}
                    step="configure"
                    context={stepContext}
                    onUpdateFooter={setDynamicFooter}
                  />
                )}
                renderTest={() => (
                  <IntegrationStepRenderer
                    descriptor={activeDescriptor}
                    step="test"
                    context={stepContext}
                    onUpdateFooter={setDynamicFooter}
                  />
                )}
                footer={
                  dynamicFooter ? (
                    dynamicFooter.layout === "test-controls" ? (
                      <div className="flex gap-3 w-full">
                        <Button
                          onClick={dynamicFooter.onTestTrigger}
                          className="flex-1 font-bold h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm"
                        >
                          Test trigger
                        </Button>
                        <Button
                          onClick={handleContinue}
                          variant="outline"
                          className="flex-1 font-bold h-12 rounded-xl border-border text-foreground hover:bg-muted transition-all"
                        >
                          Continue
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleContinue}
                        disabled={dynamicFooter.disabled}
                        className={cn(
                          "continue-btn w-full font-bold h-12 shadow-sm transition-all rounded-xl",
                          dynamicFooter.disabled
                            ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        {dynamicFooter.label}
                      </Button>
                    )
                  ) : (
                    <Button
                      onClick={handleContinue}
                      className={cn(
                        "w-full font-bold h-12 shadow-sm transition-all rounded-xl",
                        activeStep === "setup" && !activeNode?.eventLabel
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      Continue
                    </Button>
                  )
                }
              />
            </div>
          )}

          {/* ── MONITOR VIEW ── */}
          {activeView === "monitor" && (
            <div className="flex flex-1 overflow-hidden bg-muted/30">
              {/* Executions list */}
              <div className="w-[400px] shrink-0 border-r border-border overflow-hidden flex flex-col bg-background">
                {currentWorkflowId ? (
                  <ExecutionList
                    workflowId={currentWorkflowId}
                    activeExecutionId={activeExecutionId}
                    onSelectExecution={(id) => setActiveExecutionId(id)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Activity className="h-10 w-10 text-muted-foreground/40" />
                    <div className="text-center px-8">
                      <p className="text-sm font-medium text-foreground">
                        No workflow selected
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Create or select a workflow to view its executions.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Execution detail */}
              <div className="flex-1 overflow-hidden">
                {activeExecutionId ? (
                  <ExecutionDetail
                    executionId={activeExecutionId}
                    onClose={() => setActiveExecutionId(null)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Activity className="h-12 w-12 text-muted-foreground/40" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Select an execution to view details
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click a run from the list on the left.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          CREATE WORKFLOW NAME MODAL
          ════════════════════════════════════════════════════ */}
      <CreateWorkflowNameModal
        isOpen={isNameModalOpen}
        onClose={() => setIsNameModalOpen(false)}
        onCreate={handleCreateWithCustomName}
        isLoading={isCreatingWorkflow}
        availableTags={tags}
        onCreateTag={async (name) => createTag(name)}
      />
    </div>
  );
}



