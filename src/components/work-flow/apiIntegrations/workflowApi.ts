/**
 * workflowApi.ts
 * ─────────────────────────────────────────────────────────────
 * RTK Query API slice covering every backend route for the
 * Zapier-style workflow builder.
 *
 * Tables backed: workflows · workflow_nodes · field_mappings
 *                executions · execution_steps
 */

import { axiosBaseQuery } from "@/src/store/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import { ApiResponse } from "./types/integration.types";
// clientkey removed — all requests are JWT-only (Bearer token via axios interceptor)

// ── Domain Types ────────────────────────────────────────────────────────────

export interface WorkflowRecord {
    id: string;
    name: string;
    user_id?: string;
    status: "draft" | "active" | "paused";
    tag?: string;
    folder_id?: string | null;
    position?: number;
    created_at?: string;
    updated_at?: string;
}

export interface ReorderWorkflowItem {
    id: string;
    folder_id: string | null;
    position: number;
}

export interface WorkflowNodeRecord {
    id: string;
    workflow_id: string;
    type: "trigger" | "action";
    node_category: "trigger" | "action";
    integration_key: string;
    action_key: string;
    config: Record<string, any>;
    position: number;
    user_id?: string;
    sample_payload?: Record<string, any>;
    output_schema?: Record<string, null>;
}

export type MappingType = "dynamic" | "static" | "template";

export interface FieldMappingRecord {
    id: string;
    workflow_node_id: string;
    mapping_type: MappingType;
    // dynamic
    source_node_id?: string;
    source_field?: string;
    // static
    static_value?: string;
    // template (mixed static text + {{map:...}} tokens, resolved at execution)
    template?: string;
    destination_field: string;
}

export type CreateMappingPayload =
    | {
          mapping_type: "dynamic";
          source_node_id: string;
          source_field: string;
          destination_field: string;
      }
    | {
          mapping_type: "static";
          static_value: string;
          destination_field: string;
      }
    | {
          mapping_type: "template";
          source_node_id: string;
          template: string;
          destination_field: string;
      };

export interface ExecutionRecord {
    id: string;
    workflow_id: string;
    status: "running" | "success" | "failed";
    trigger_payload?: Record<string, any>;
    started_at: string;
    finished_at?: string;
}

export interface ExecutionStepRecord {
    id: string;
    execution_id: string;
    workflow_node_id: string;
    status: "pending" | "running" | "success" | "failed";
    input_data?: Record<string, any>;
    output_data?: Record<string, any>;
    error_message?: string;
    node_label?: string;
}

export interface ExecutionDetailRecord extends ExecutionRecord {
    steps: ExecutionStepRecord[];
}

// ── Polling Subscription Types ─────────────────────────────────────────────

export interface PollingSubscriptionRecord {
    id: string;
    workflow_id: string;
    node_id: string;
    user_id: string;
    integration_key: string;
    event_key: string;
    config: Record<string, any>;
    poll_interval: number;
    cursor_value: string | null;
    cursor_type: string;
    last_polled_at: string | null;
    last_error: string | null;
    error_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreatePollingSubscriptionPayload {
    workflow_id: string;
    node_id: string;
    integration_key: string;
    event_key: string;
    config?: Record<string, any>;
    poll_interval?: number;
}

export interface PollingSubscriptionStatus {
    id: string;
    is_active: boolean;
    last_polled_at: string | null;
    cursor_value: string | null;
    error_count: number;
    last_error: string | null;
    total_seen_records: number;
}

// ── RTK Query API ────────────────────────────────────────────────────────────

export const workflowApi = createApi({
    reducerPath: "workflowApi",

    baseQuery: axiosBaseQuery(),
    tagTypes: [
        "Workflow",
        "WorkflowList",
        "Node",
        "Mapping",
        "Execution",
        "ExecutionDetail",
        "PollingSubscription",
    ],

    endpoints: (builder) => ({
        // ── Workflows ─────────────────────────────────────────────
        getWorkflows: builder.query<
            ApiResponse<WorkflowRecord[]>,
            { userId: string; role?: string }
        >({
            query: ({ userId, role }) => ({
                url: `/automation/workflows/getAllworkflows`,
                method: "GET",
                params: { userId, ...(role ? { role } : {}) },
            }),
            providesTags: ["WorkflowList"],
        }),

        // GET /automation/workflows/workflows/:id
        getWorkflow: builder.query<ApiResponse<WorkflowRecord>, string>({
            query: (id) => ({
                url: `/automation/workflows/workflows/${id}`,
                method: "GET",
            }),
            providesTags: (_r, _e, id) => [{ type: "Workflow", id }],
        }),

        createWorkflow: builder.mutation<
            ApiResponse<WorkflowRecord>,
            { name: string; tag?: string; user_id: string; folder_id?: string | null }
        >({
            query: ({ user_id, name, tag, folder_id }) => ({
                url: `/automation/workflows/create`,
                method: "POST",
                data: {
                    name,
                    user_id,
                    ...(tag ? { tag } : {}),
                    ...(folder_id !== undefined ? { folder_id } : {}),
                },
            }),
            invalidatesTags: ["WorkflowList"],
        }),

        updateWorkflow: builder.mutation<
            WorkflowRecord,
            {
                id: string;
                patch: Partial<
                    Pick<WorkflowRecord, "name" | "status" | "tag" | "folder_id" | "position">
                >;
            }
        >({
            query: ({ id, patch }) => ({
                url: `/automation/workflows/workflows/${id}`,
                method: "PATCH",
                data: patch,
            }),
            invalidatesTags: (_r, _e, { id }) => [
                { type: "Workflow", id },
                "WorkflowList",
            ],
        }),

        bulkMoveWorkflows: builder.mutation<
            ApiResponse<{ message: string }>,
            { ids: string[]; folder_id: string | null }
        >({
            query: (data) => ({
                url: `/automation/workflows/workflows/bulk-move`,
                method: "POST",
                data,
            }),
            invalidatesTags: ["WorkflowList"],
        }),

        reorderWorkflows: builder.mutation<
            ApiResponse<{ message: string }>,
            { items: ReorderWorkflowItem[] }
        >({
            query: (data) => ({
                url: `/automation/workflows/workflows/reorder`,
                method: "POST",
                data,
            }),
            invalidatesTags: ["WorkflowList"],
        }),

        deleteWorkflow: builder.mutation<void, string>({
            query: (id) => ({
                url: `/automation/workflows/workflows/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["WorkflowList"],
        }),

        activateWorkflow: builder.mutation<ApiResponse<WorkflowRecord>, string>({
            query: (id) => ({
                url: `/automation/workflows/workflows/${id}/activate`,
                method: "POST",
            }),
            invalidatesTags: (_r, _e, id) => [{ type: "Workflow", id }, "WorkflowList"],
        }),

        // ── Nodes ─────────────────────────────────────────────────
        getWorkflowNodes: builder.query<ApiResponse<WorkflowNodeRecord[]>, string>({
            query: (workflowId) => ({
                url: `/automation/workflows/nodes/getNodes/${workflowId}`,
                method: "GET",
            }),
            providesTags: (_r, _e, workflowId) => [
                { type: "Node", id: workflowId },
            ],
        }),

        createNode: builder.mutation<
            ApiResponse<WorkflowNodeRecord>,
            Omit<WorkflowNodeRecord, "id">
        >({
            query: (data) => ({
                url: `/automation/workflows/nodes/create/${data.workflow_id}`,
                method: "POST",
                data: data,
            }),
            invalidatesTags: (_r, _e, arg) => [
                { type: "Workflow", id: arg.workflow_id },
                { type: "Node", id: arg.workflow_id },
            ],
        }),

        updateNode: builder.mutation<
            ApiResponse<WorkflowNodeRecord>,
            { id: string; patch: Partial<WorkflowNodeRecord> }
        >({
            query: ({ id, patch }) => ({
                url: `/automation/workflows/nodes/update/${id}`,
                method: "PATCH",
                data: patch,
            }),
            invalidatesTags: ["Node"]
        }),

        deleteNode: builder.mutation<void, string>({
            query: (id) => ({ url: `/automation/workflows/nodes/delete/${id}`, method: "DELETE" }),
            invalidatesTags: ["Node"]
        }),

        // ── Field Mappings ─────────────────────────────────────────
        getMappings: builder.query<ApiResponse<FieldMappingRecord[]>, string>({
            query: (nodeId) => ({
                url: `/automation/workflows/test/nodes/${nodeId}/mappings`,
                method: "GET",
            }),
            providesTags: (_r, _e, nodeId) => [{ type: "Mapping", id: nodeId }],
        }),

        saveMappings: builder.mutation<
            ApiResponse<FieldMappingRecord[]>,
            { nodeId: string; mappings: CreateMappingPayload[] }
        >({
            query: ({ nodeId, mappings }) => ({
                url: `/automation/workflows/test/nodes/${nodeId}/mappings/bulk`,
                method: "POST",
                data: { mappings },
            }),
            invalidatesTags: (_r, _e, { nodeId }) => [
                { type: "Mapping", id: nodeId },
            ],
        }),

        // DELETE /automation/workflows/test/nodes/:id/mappings/:mappingId
        deleteMapping: builder.mutation<void, { nodeId: string; mappingId: string }>({
            query: ({ nodeId, mappingId }) => ({
                url: `/automation/workflows/test/nodes/${nodeId}/mappings/${mappingId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_r, _e, { nodeId }) => [
                { type: "Mapping", id: nodeId },
            ],
        }),

        // ── Executions ─────────────────────────────────────────────
        getExecutions: builder.query<ApiResponse<ExecutionRecord[]>, string>({
            query: (workflowId) => ({
                url: `/automation/workflows/${workflowId}/executions`,
                method: "GET",
            }),
            providesTags: (_r, _e, workflowId) => [
                { type: "Execution", id: workflowId },
            ],
        }),

        getExecutionDetail: builder.query<ApiResponse<ExecutionDetailRecord>, string>({
            query: (executionId) => ({
                url: `/automation/workflows/executions/${executionId}`,
                method: "GET",
            }),
            providesTags: (_r, _e, id) => [{ type: "ExecutionDetail", id }],
        }),

        // POST /automation/workflows/:id/execute  (also auto-triggered by webhook on backend)
        testWorkflow: builder.mutation<ApiResponse<ExecutionRecord>, string>({
            query: (workflowId) => ({
                url: `/automation/workflows/${workflowId}/execute`,
                method: "POST",
            }),
            invalidatesTags: (_r, _e, workflowId) => [
                { type: "Execution", id: workflowId },
            ],
        }),

        // ── Polling Subscriptions ─────────────────────────────────────
        createPollingSubscription: builder.mutation<
            ApiResponse<PollingSubscriptionRecord>,
            CreatePollingSubscriptionPayload
        >({
            query: (data) => ({
                url: `/automation/polling/subscriptions`,
                method: "POST",
                data,
            }),
            invalidatesTags: ["PollingSubscription"],
        }),

        getPollingSubscription: builder.query<
            ApiResponse<PollingSubscriptionRecord | null>,
            string
        >({
            query: (nodeId) => ({
                url: `/automation/polling/subscriptions/by-node/${nodeId}`,
                method: "GET",
            }),
            providesTags: (_r, _e, nodeId) => [
                { type: "PollingSubscription", id: nodeId },
            ],
        }),

        updatePollingSubscription: builder.mutation<
            ApiResponse<PollingSubscriptionRecord>,
            { id: string; patch: Partial<PollingSubscriptionRecord> }
        >({
            query: ({ id, patch }) => ({
                url: `/automation/polling/subscriptions/${id}`,
                method: "PATCH",
                data: patch,
            }),
            invalidatesTags: ["PollingSubscription"],
        }),

        deletePollingSubscription: builder.mutation<void, string>({
            query: (id) => ({
                url: `/automation/polling/subscriptions/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["PollingSubscription"],
        }),

        pollNow: builder.mutation<
            ApiResponse<{ found: boolean; data: Record<string, any> | null }>,
            string
        >({
            query: (subscriptionId) => ({
                url: `/automation/polling/subscriptions/${subscriptionId}/poll-now`,
                method: "POST",
            }),
        }),

        getPollingSubscriptionStatus: builder.query<
            ApiResponse<PollingSubscriptionStatus>,
            string
        >({
            query: (id) => ({
                url: `/automation/polling/subscriptions/${id}/status`,
                method: "GET",
            }),
        }),
    }),
});

// ── Auto-generated hooks ─────────────────────────────────────────────────────
export const {
    useGetWorkflowsQuery,
    useGetWorkflowQuery,
    useGetWorkflowNodesQuery,
    useCreateWorkflowMutation,
    useUpdateWorkflowMutation,
    useDeleteWorkflowMutation,
    useActivateWorkflowMutation,
    useBulkMoveWorkflowsMutation,
    useReorderWorkflowsMutation,
    useCreateNodeMutation,
    useUpdateNodeMutation,
    useDeleteNodeMutation,
    useGetMappingsQuery,
    useSaveMappingsMutation,
    useDeleteMappingMutation,
    useGetExecutionsQuery,
    useGetExecutionDetailQuery,
    useTestWorkflowMutation,
    // Polling subscriptions
    useCreatePollingSubscriptionMutation,
    useGetPollingSubscriptionQuery,
    useUpdatePollingSubscriptionMutation,
    useDeletePollingSubscriptionMutation,
    usePollNowMutation,
    useGetPollingSubscriptionStatusQuery,
} = workflowApi;
