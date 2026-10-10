/**
 * folderTagApi.ts
 * ─────────────────────────────────────────────────────────────
 * RTK Query API slice for Folders, Tags CRUD, and Tag ↔ Workflow linking.
 *
 * Role behaviour:
 *   - role omitted → returns only the current user's records
 *   - role="admin" → returns all records across all users
 */

import { axiosBaseQuery } from "@/src/store/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import { ApiResponse } from "./types/integration.types";

// ── Domain Types ────────────────────────────────────────────────────────────

export interface FolderRecord {
    id: string;
    name: string;
    user_id?: string;
    parent_id?: string | null;
    position?: number;
    created_at?: string;
    updated_at?: string;
}

export interface ReorderFolderItem {
    id: string;
    parent_id: string | null;
    position: number;
}

export interface TagRecord {
    id: string;
    name: string;
    color?: string;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface WorkflowTagLink {
    id?: string;
    workflow_id: string;
    tag_id: string;
    tag?: TagRecord;
}

// ── RTK Query API ────────────────────────────────────────────────────────────

export const folderTagApi = createApi({
    reducerPath: "folderTagApi",
    baseQuery: axiosBaseQuery(),
    tagTypes: ["Folder", "Tag", "WorkflowTags"],

    endpoints: (builder) => ({
        // ── Folders ───────────────────────────────────────────────────

        getFolders: builder.query<
            ApiResponse<FolderRecord[]>,
            { userId: string; role?: string }
        >({
            query: ({ userId, role }) => ({
                url: `/automation/folders/getAll`,
                method: "GET",
                params: { userId, ...(role ? { role } : {}) },
            }),
            providesTags: ["Folder"],
        }),

        createFolder: builder.mutation<
            ApiResponse<FolderRecord>,
            { name: string; user_id: string; parent_id?: string | null; position?: number }
        >({
            query: (data) => ({
                url: `/automation/folders/create`,
                method: "POST",
                data,
            }),
            invalidatesTags: ["Folder"],
        }),

        updateFolder: builder.mutation<
            ApiResponse<FolderRecord>,
            { id: string; name?: string; parent_id?: string | null; position?: number }
        >({
            query: ({ id, ...patch }) => ({
                url: `/automation/folders/${id}`,
                method: "PATCH",
                data: patch,
            }),
            invalidatesTags: ["Folder"],
        }),

        deleteFolder: builder.mutation<void, string>({
            query: (id) => ({
                url: `/automation/folders/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Folder"],
        }),

        reorderFolders: builder.mutation<
            ApiResponse<{ message: string }>,
            { items: ReorderFolderItem[] }
        >({
            query: (data) => ({
                url: `/automation/folders/reorder`,
                method: "POST",
                data,
            }),
            invalidatesTags: ["Folder"],
        }),

        // ── Tags CRUD ────────────────────────────────────────────────

        getTags: builder.query<
            ApiResponse<TagRecord[]>,
            { userId: string; role?: string }
        >({
            query: ({ userId, role }) => ({
                url: `/automation/tags/getAll`,
                method: "GET",
                params: { userId, ...(role ? { role } : {}) },
            }),
            providesTags: ["Tag"],
        }),

        createTag: builder.mutation<
            ApiResponse<TagRecord>,
            { name: string; color?: string; user_id: string }
        >({
            query: (data) => ({
                url: `/automation/tags/create`,
                method: "POST",
                data,
            }),
            invalidatesTags: ["Tag"],
        }),

        updateTag: builder.mutation<
            ApiResponse<TagRecord>,
            { id: string; patch: Partial<Pick<TagRecord, "name" | "color">> }
        >({
            query: ({ id, patch }) => ({
                url: `/automation/tags/${id}`,
                method: "PATCH",
                data: patch,
            }),
            invalidatesTags: ["Tag"],
        }),

        deleteTag: builder.mutation<void, string>({
            query: (id) => ({
                url: `/automation/tags/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Tag", "WorkflowTags"],
        }),

        // ── Tag ↔ Workflow Linking ───────────────────────────────────

        getWorkflowTags: builder.query<ApiResponse<TagRecord[]>, string>({
            query: (workflowId) => ({
                url: `/automation/tags/workflow/${workflowId}`,
                method: "GET",
            }),
            providesTags: (_r, _e, workflowId) => [
                { type: "WorkflowTags", id: workflowId },
            ],
        }),

        assignTagToWorkflow: builder.mutation<
            ApiResponse<WorkflowTagLink>,
            { workflowId: string; tag_id: string }
        >({
            query: ({ workflowId, tag_id }) => ({
                url: `/automation/tags/workflow/${workflowId}`,
                method: "POST",
                data: { tag_id },
            }),
            invalidatesTags: (_r, _e, { workflowId }) => [
                { type: "WorkflowTags", id: workflowId },
            ],
        }),

        removeTagFromWorkflow: builder.mutation<
            void,
            { workflowId: string; tagId: string }
        >({
            query: ({ workflowId, tagId }) => ({
                url: `/automation/tags/workflow/${workflowId}/${tagId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_r, _e, { workflowId }) => [
                { type: "WorkflowTags", id: workflowId },
            ],
        }),

        getWorkflowsByTag: builder.query<ApiResponse<any[]>, string>({
            query: (tagId) => ({
                url: `/automation/tags/filter/${tagId}`,
                method: "GET",
            }),
        }),
    }),
});

// ── Auto-generated hooks ─────────────────────────────────────────────────────
export const {
    useGetFoldersQuery,
    useCreateFolderMutation,
    useUpdateFolderMutation,
    useDeleteFolderMutation,
    useReorderFoldersMutation,
    useGetTagsQuery,
    useCreateTagMutation,
    useUpdateTagMutation,
    useDeleteTagMutation,
    useGetWorkflowTagsQuery,
    useAssignTagToWorkflowMutation,
    useRemoveTagFromWorkflowMutation,
    useGetWorkflowsByTagQuery,
} = folderTagApi;
