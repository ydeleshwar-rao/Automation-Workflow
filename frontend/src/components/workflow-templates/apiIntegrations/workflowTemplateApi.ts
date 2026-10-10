/**
 * workflowTemplateApi.ts
 * ─────────────────────────────────────────────────────────────
 * RTK Query API slice for the Workflow Templates feature.
 *
 * Base path: /automation/workflow-templates
 */

import { axiosBaseQuery } from "@/src/store/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiResponse } from "@/src/components/work-flow/apiIntegrations/types/integration.types";
import type {
  ApplyTemplateBody,
  ApplyTemplateResult,
  CreateTemplateBody,
  ListTemplatesParams,
  TemplateDetail,
  TemplateNode,
  UpdateTemplateBody,
  WorkflowTemplate,
} from "../types";

const BASE = "/automation/workflow-templates";

export const workflowTemplateApi = createApi({
  reducerPath: "workflowTemplateApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["TemplateList", "Template"],

  endpoints: (builder) => ({
    listTemplates: builder.query<ApiResponse<WorkflowTemplate[]>, ListTemplatesParams | void>({
      query: (params) => ({
        url: `${BASE}`,
        method: "GET",
        params: params ?? undefined,
      }),
      providesTags: ["TemplateList"],
    }),

    getTemplate: builder.query<ApiResponse<TemplateDetail>, string>({
      query: (id) => ({ url: `${BASE}/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "Template", id }],
    }),

    createTemplate: builder.mutation<
      ApiResponse<WorkflowTemplate & { nodes: TemplateNode[] }>,
      CreateTemplateBody
    >({
      query: (body) => ({ url: `${BASE}/create`, method: "POST", data: body }),
      invalidatesTags: ["TemplateList"],
    }),

    updateTemplate: builder.mutation<
      ApiResponse<WorkflowTemplate>,
      { id: string; patch: UpdateTemplateBody }
    >({
      query: ({ id, patch }) => ({ url: `${BASE}/${id}`, method: "PATCH", data: patch }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Template", id }, "TemplateList"],
    }),

    deleteTemplate: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({ url: `${BASE}/${id}`, method: "DELETE" }),
      invalidatesTags: ["TemplateList"],
    }),

    applyTemplate: builder.mutation<
      ApiResponse<ApplyTemplateResult>,
      { id: string; body: ApplyTemplateBody }
    >({
      query: ({ id, body }) => ({
        url: `${BASE}/${id}/apply`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: ["TemplateList"],
    }),
  }),
});

export const {
  useListTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useApplyTemplateMutation,
} = workflowTemplateApi;
