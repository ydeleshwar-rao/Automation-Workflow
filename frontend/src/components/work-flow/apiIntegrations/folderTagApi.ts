/**
 * folderTagApi.ts
 * ─────────────────────────────────────────────────────────────
 * RTK Query API slice for Folders, Tags CRUD, and Tag ↔ Workflow linking.
 *
 * Folders: role omitted → the current user's folders; role="admin" → everyone's.
 * Tags: shared by the whole organization; only admins create, edit or delete them,
 * and an admin switch (tag settings) turns tagging on or off.
 */

import { baseApi } from "@/src/store/baseApi";
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

/** GET /automation/tags/filter/:tagId item shape. */
export interface WorkflowsByTagItem {
    workflow_id: string;
    workflows: { id: string; name: string; status: string };
}

/** Organization-wide admin switch for workflow tags. */
export interface WorkflowTagSettings {
    enabled: boolean;
}

export interface WorkflowTagLink {
    id?: string;
    workflow_id: string;
    tag_id: string;
    tag?: TagRecord;
}

// ── RTK Query API ────────────────────────────────────────────────────────────

export const folderTagApi = baseApi.enhanceEndpoints({ addTagTypes: ["Folder", "Tag", "TagSettings", "WorkflowTags", "WorkflowList"] }).injectEndpoints({
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

        // Tags are shared across the signed-in user's organization (resolved from the auth cookie)
        getTags: builder.query<ApiResponse<TagRecord[]>, void>({
            query: () => ({ url: `/automation/tags/getAll`, method: "GET" }),
            providesTags: ["Tag"],
        }),

        getTagSettings: builder.query<ApiResponse<WorkflowTagSettings>, void>({
            query: () => ({ url: `/automation/tags/settings`, method: "GET" }),
            providesTags: ["TagSettings"],
        }),

        /** Admin only. Updates the cached switch immediately; rolls back if the request fails. */
        updateTagSettings: builder.mutation<ApiResponse<WorkflowTagSettings>, WorkflowTagSettings>({
            query: (settings) => ({ url: `/automation/tags/settings`, method: "PATCH", data: settings }),
            async onQueryStarted(settings, { dispatch, queryFulfilled }) {
                const optimisticPatch = dispatch(
                    folderTagApi.util.updateQueryData("getTagSettings", undefined, (draftResponse) => {
                        draftResponse.data = settings;
                    })
                );
                await queryFulfilled.catch(() => optimisticPatch.undo());
            },
            invalidatesTags: ["TagSettings"],
        }),

        /** Admin only. */
        createTag: builder.mutation<
            ApiResponse<TagRecord>,
            { name: string; color?: string }
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
            // The workflow list carries tag_ids, so tag changes refresh it too
            invalidatesTags: ["Tag", "WorkflowTags", "WorkflowList"],
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
                "WorkflowList",
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
                "WorkflowList",
            ],
        }),

        getWorkflowsByTag: builder.query<ApiResponse<WorkflowsByTagItem[]>, string>({
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
    useGetTagSettingsQuery,
    useUpdateTagSettingsMutation,
    useCreateTagMutation,
    useUpdateTagMutation,
    useDeleteTagMutation,
    useGetWorkflowTagsQuery,
    useAssignTagToWorkflowMutation,
    useRemoveTagFromWorkflowMutation,
    useGetWorkflowsByTagQuery,
} = folderTagApi;
