import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { Execution, ExecutionDetail, FieldMapping, WorkflowNodeData } from "@/src/components/work-flow/uiOrchestrator/types";

// ── Sub-state shapes ──────────────────────────────────────────────────────────

interface WorkflowMeta {
  id: string | null;
  name: string;
  status: "draft" | "active" | "paused";
}

interface WorkflowBuilderState {
  // ── Active workflow ──────────────────────────────────────────
  workflow: WorkflowMeta;

  // ── Canvas nodes ─────────────────────────────────────────────
  nodes: WorkflowNodeData[];

  // ── Field mappings keyed by nodeId ───────────────────────────
  mappings: Record<string, FieldMapping[]>;

  // ── Webhook test data ────────────────────────────────────────
  webhookTestData: any | null;

  // ── Execution monitor ────────────────────────────────────────
  executions: Execution[];
  activeExecutionId: string | null;
  activeExecutionDetail: ExecutionDetail | null;

  // ── UI flags ─────────────────────────────────────────────────
  /** Which top-level tab is visible: "builder" | "monitor" */
  activeView: "builder" | "monitor";
}

// ── Initial state ─────────────────────────────────────────────────────────────

const initialState: WorkflowBuilderState = {
  workflow: {
    id: null,
    name: "",
    status: "draft",
  },

  nodes: [
    {
      id: "trigger",
      type: "trigger",
      nodeType: "trigger",
      index: 1,
      label: "Trigger",
      description: "Select the event that starts your workflow",
      config: {},
      status: "draft",
    },
    {
      id: "action-1",
      type: "action",
      nodeType: "action",
      index: 2,
      label: "Action",
      description: "Select the event for your zap to run",
      config: {},
      status: "draft",
    },
  ],

  mappings: {},
  webhookTestData: null,

  executions: [],
  activeExecutionId: null,
  activeExecutionDetail: null,

  activeView: "builder",
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const workflowBuilderSlice = createSlice({
  name: "workflowBuilder",
  initialState,

  reducers: {
    // ── Workflow meta ─────────────────────────────────────────
    setWorkflow(state, action: PayloadAction<WorkflowMeta>) {
      state.workflow = action.payload;
    },

    setWorkflowStatus(
      state,
      action: PayloadAction<"draft" | "active" | "paused">
    ) {
      state.workflow.status = action.payload;
    },

    // ── Nodes ─────────────────────────────────────────────────
    addNode(state, action: PayloadAction<WorkflowNodeData>) {
      state.nodes.push(action.payload);
    },

    updateNode(state, action: PayloadAction<WorkflowNodeData>) {
      const idx = state.nodes.findIndex((n) => n.id === action.payload.id);
      if (idx !== -1) {
        state.nodes[idx] = { ...state.nodes[idx], ...action.payload };
      }
    },

    deleteNode(state, action: PayloadAction<string>) {
      state.nodes = state.nodes.filter((n) => n.id !== action.payload);
      state.nodes.forEach((n, idx) => {
        n.index = idx + 1;
      });
    },

    setNodes(state, action: PayloadAction<WorkflowNodeData[]>) {
      state.nodes = action.payload;
    },

    // ── Field Mappings ────────────────────────────────────────
    setMappingsForNode(
      state,
      action: PayloadAction<{ nodeId: string; mappings: FieldMapping[] }>
    ) {
      state.mappings[action.payload.nodeId] = action.payload.mappings;
    },

    /** @deprecated Use setMappingsForNode — kept for back-compat */
    setMapping(
      state,
      action: PayloadAction<{ nodeId: string; mappings: Record<string, any> }>
    ) {
      const { nodeId, mappings } = action.payload;
      state.mappings[nodeId] = Object.entries(mappings).map(
        ([source_field, destination_field]) => ({
          workflow_node_id: nodeId,
          source_field,
          destination_field,
        })
      );
    },

    // ── Webhook test ──────────────────────────────────────────
    setWebhookTestData(state, action: PayloadAction<any>) {
      state.webhookTestData = action.payload;
    },

    // ── Executions ────────────────────────────────────────────
    setExecutions(state, action: PayloadAction<Execution[]>) {
      state.executions = action.payload;
    },

    setActiveExecutionId(state, action: PayloadAction<string | null>) {
      state.activeExecutionId = action.payload;
    },

    setActiveExecutionDetail(
      state,
      action: PayloadAction<ExecutionDetail | null>
    ) {
      state.activeExecutionDetail = action.payload;
    },

    // ── UI view ───────────────────────────────────────────────
    setActiveView(
      state,
      action: PayloadAction<"builder" | "monitor">
    ) {
      state.activeView = action.payload;
    },
  },
});

export const {
  setWorkflow,
  setWorkflowStatus,
  addNode,
  updateNode,
  deleteNode,
  setNodes,
  setMappingsForNode,
  setMapping,
  setWebhookTestData,
  setExecutions,
  setActiveExecutionId,
  setActiveExecutionDetail,
  setActiveView,
} = workflowBuilderSlice.actions;

export default workflowBuilderSlice.reducer;