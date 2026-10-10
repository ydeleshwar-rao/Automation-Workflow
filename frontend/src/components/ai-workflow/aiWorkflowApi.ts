// aiWorkflowApi.ts — RTK Query API slice for the AI Visual Workflow builder

import { axiosBaseQuery } from "@/src/store/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  AiWorkflowRecord,
  AiWorkflowListItem,
  AiWorkflowExecution,
} from "@/src/lib/ai-workflow/types";
import type { ApiResponse } from "@/src/components/work-flow/apiIntegrations/types/integration.types";

export const aiWorkflowApi = createApi({
  reducerPath: "aiWorkflowApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["AiWorkflow", "AiWorkflowList", "AiExecution"],

  endpoints: (builder) => ({

    // ── Workflow list ────────────────────────────────────────
    getAiWorkflows: builder.query<
      ApiResponse<AiWorkflowListItem[]>,
      { userId: string }
    >({
      query: ({ userId }) => ({
        url: "/ai-workflow",
        method: "GET",
        params: { userId },
      }),
      providesTags: ["AiWorkflowList"],
    }),

    // ── Single workflow (full canvas state) ──────────────────
    getAiWorkflow: builder.query<ApiResponse<AiWorkflowRecord>, string>({
      query: (id) => ({ url: `/ai-workflow/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "AiWorkflow", id }],
    }),

    // ── Create ───────────────────────────────────────────────
    createAiWorkflow: builder.mutation<
      ApiResponse<AiWorkflowListItem>,
      { user_id: string; name?: string; description?: string }
    >({
      query: (data) => ({ url: "/ai-workflow", method: "POST", data }),
      invalidatesTags: ["AiWorkflowList"],
    }),

    // ── Update (canvas save — sends nodes, edges, viewport) ──
    updateAiWorkflow: builder.mutation<
      ApiResponse<AiWorkflowRecord>,
      { id: string; patch: Partial<AiWorkflowRecord> & { viewport?: AiWorkflowRecord["viewport"] } }
    >({
      query: ({ id, patch }) => ({
        url: `/ai-workflow/${id}`,
        method: "PATCH",
        data: patch,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "AiWorkflow", id },
        "AiWorkflowList",
      ],
    }),

    // ── Delete ───────────────────────────────────────────────
    deleteAiWorkflow: builder.mutation<ApiResponse<{ id: string }>, string>({
      query: (id) => ({ url: `/ai-workflow/${id}`, method: "DELETE" }),
      invalidatesTags: ["AiWorkflowList"],
    }),

    // ── Run ──────────────────────────────────────────────────
    runAiWorkflow: builder.mutation<ApiResponse<AiWorkflowExecution>, string>({
      query: (id) => ({ url: `/ai-workflow/${id}/run`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "AiExecution", id }],
    }),

    // ── Executions ───────────────────────────────────────────
    getAiWorkflowExecutions: builder.query<
      ApiResponse<AiWorkflowExecution[]>,
      string
    >({
      query: (workflowId) => ({
        url: `/ai-workflow/${workflowId}/executions`,
        method: "GET",
      }),
      providesTags: (_r, _e, id) => [{ type: "AiExecution", id }],
    }),
  }),
});

export const {
  useGetAiWorkflowsQuery,
  useGetAiWorkflowQuery,
  useCreateAiWorkflowMutation,
  useUpdateAiWorkflowMutation,
  useDeleteAiWorkflowMutation,
  useRunAiWorkflowMutation,
  useGetAiWorkflowExecutionsQuery,
} = aiWorkflowApi;
