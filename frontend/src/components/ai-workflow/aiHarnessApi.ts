import { getActiveUserId } from "@/src/store/localStorage";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { HarnessFlowPayload } from "@/src/lib/ai-workflow/harnessAdapter";

export interface HarnessFlowResponse {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  engine_type: string;
  provider: Record<string, unknown>;
  engine_config: Record<string, unknown>;
  webhook_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HarnessExecuteRequest {
  input: string;
  variables?: Record<string, unknown>;
  stream?: boolean;
}

export interface HarnessExecuteResponse {
  flow_id: string;
  execution_id: string;
  output: unknown;
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  cache_hit: boolean;
  duration_ms: number;
  status: "success" | "failed";
  error?: string | null;
}

function getUserId() {
  if (typeof window === "undefined") return "anonymous";
  return getActiveUserId() || "anonymous";
}

export const aiHarnessApi = createApi({
  reducerPath: "aiHarnessApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_AI_HARNESS_URL || "http://localhost:8000",
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      headers.set("X-User-Id", getUserId());
      return headers;
    },
  }),
  tagTypes: ["HarnessFlow", "HarnessExecution"],
  endpoints: (builder) => ({
    health: builder.query<{ status: string; version: string }, void>({
      query: () => "/health",
    }),
    createHarnessFlow: builder.mutation<HarnessFlowResponse, HarnessFlowPayload>({
      query: (body) => ({
        url: "/flows",
        method: "POST",
        body,
      }),
      invalidatesTags: ["HarnessFlow"],
    }),
    executeHarnessFlow: builder.mutation<
      HarnessExecuteResponse,
      { flowId: string; body: HarnessExecuteRequest }
    >({
      query: ({ flowId, body }) => ({
        url: `/execute/${flowId}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { flowId }) => [{ type: "HarnessExecution", id: flowId }],
    }),
  }),
});

export const {
  useHealthQuery,
  useCreateHarnessFlowMutation,
  useExecuteHarnessFlowMutation,
} = aiHarnessApi;
