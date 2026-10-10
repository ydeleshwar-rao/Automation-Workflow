/**
 * templateFolderApi.ts
 * ─────────────────────────────────────────────────────────────
 * RTK Query API slice for Template Folders (family templates).
 *
 * Base path: /automation/workflow-template-folders
 */

import { axiosBaseQuery } from "@/src/store/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiResponse } from "@/src/components/work-flow/apiIntegrations/types/integration.types";
import type {
  BulkApplyFolderBody,
  BulkApplyFolderResultItem,
  CreateTemplateFolderBody,
  TemplateFolderRecord,
  UpdateTemplateFolderBody,
} from "../types";

export interface IntegrationStatusItem {
  connected: boolean;
  needs_reauth?: boolean;
}
export type IntegrationStatusMap = Record<string, IntegrationStatusItem>;

const BASE = "/automation/workflow-template-folders";

export const templateFolderApi = createApi({
  reducerPath: "templateFolderApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["TemplateFolderList"],

  endpoints: (builder) => ({
    listTemplateFolders: builder.query<
      ApiResponse<TemplateFolderRecord[]>,
      { created_by?: string } | void
    >({
      query: (params) => ({
        url: BASE,
        method: "GET",
        params: params ?? undefined,
      }),
      providesTags: ["TemplateFolderList"],
    }),

    createTemplateFolder: builder.mutation<
      ApiResponse<TemplateFolderRecord>,
      CreateTemplateFolderBody
    >({
      query: (body) => ({ url: `${BASE}/create`, method: "POST", data: body }),
      invalidatesTags: ["TemplateFolderList"],
    }),

    updateTemplateFolder: builder.mutation<
      ApiResponse<TemplateFolderRecord>,
      { id: string; patch: UpdateTemplateFolderBody }
    >({
      query: ({ id, patch }) => ({ url: `${BASE}/${id}`, method: "PATCH", data: patch }),
      invalidatesTags: ["TemplateFolderList"],
    }),

    deleteTemplateFolder: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({ url: `${BASE}/${id}`, method: "DELETE" }),
      invalidatesTags: ["TemplateFolderList"],
    }),

    getRequiredIntegrations: builder.query<ApiResponse<string[]>, string>({
      query: (folderId) => ({
        url: `${BASE}/${folderId}/required-integrations`,
        method: "GET",
      }),
    }),

    getIntegrationStatus: builder.query<
      ApiResponse<IntegrationStatusMap>,
      { userId: string; integrations?: string[] }
    >({
      query: ({ userId, integrations }) => ({
        url: `${BASE}/integration-status/${userId}`,
        method: "GET",
        params: integrations?.length ? { integrations: integrations.join(",") } : undefined,
      }),
    }),

    bulkApplyFolder: builder.mutation<
      ApiResponse<{
        folder_id: string;
        folder_name: string;
        total: number;
        succeeded: number;
        failed: number;
        results: BulkApplyFolderResultItem[];
      }>,
      { id: string; body: BulkApplyFolderBody }
    >({
      query: ({ id, body }) => ({
        url: `${BASE}/${id}/bulk-apply`,
        method: "POST",
        data: body,
      }),
    }),
  }),
});

export const {
  useListTemplateFoldersQuery,
  useCreateTemplateFolderMutation,
  useUpdateTemplateFolderMutation,
  useDeleteTemplateFolderMutation,
  useBulkApplyFolderMutation,
  useGetRequiredIntegrationsQuery,
  useGetIntegrationStatusQuery,
} = templateFolderApi;
