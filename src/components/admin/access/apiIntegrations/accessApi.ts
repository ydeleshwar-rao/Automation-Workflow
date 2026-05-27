/**
 * accessApi.ts
 * ─────────────────────────────────────────────────────────────
 * RTK Query slice for the new role-based access management API.
 *
 * New backend routes (mounted under /access):
 *   GET    /access/me
 *   GET    /access/developers
 *   POST   /access/developers
 *   GET    /access/developers/:id
 *   PATCH  /access/developers/:id/status
 *   DELETE /access/developers/:id
 *   GET    /access/developers/:id/permissions
 *   PUT    /access/developers/:id/permissions      (replace all)
 *   PATCH  /access/developers/:id/permissions/:page_key
 *   DELETE /access/developers/:id/permissions/:page_key
 *
 * Architecture changes vs old accessApi:
 *   - Removed: user_client_access assignments (no clients concept)
 *   - Removed: developer-scoped permissions (developer+client pairs)
 *   - Removed: clientkey field
 *   - New: page permissions are per-developer (no client dimension)
 *   - New: can_view / can_edit / can_delete (replaces can_read / can_write)
 */

import { createApi }      from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/src/store/axiosBaseQuery";
import type { ApiResponse } from "@/src/components/work-flow/apiIntegrations/types/integration.types";
import type { AccessRole } from "@/src/store/accessSlice";

// ── Domain Types ────────────────────────────────────────────────────────────

export interface DeveloperRecord {
  id:          string;
  email:       string;
  full_name?:  string | null;
  avatar_url?: string | null;
  role:        AccessRole | string;
  is_active:   boolean;
  created_at?: string;
}

export interface PagePermissionRecord {
  page_key:   string;
  can_view:   boolean;
  can_edit:   boolean;
  can_delete: boolean;
}

export interface CreateDeveloperDto {
  email:        string;
  full_name?:   string;
  password?:    string;          // optional; backend generates temp password if omitted
  permissions?: string[];        // initial page keys to grant
}

export interface UpdatePermissionsDto {
  permissions: Array<{
    page_key:   string;
    can_view?:  boolean;
    can_edit?:  boolean;
    can_delete?: boolean;
  }>;
}

export interface UpsertPagePermissionDto {
  can_view?:   boolean;
  can_edit?:   boolean;
  can_delete?: boolean;
}

// ── API Slice ───────────────────────────────────────────────────────────────

export const accessApi = createApi({
  reducerPath: "accessApi",
  baseQuery:   axiosBaseQuery(),
  tagTypes:    ["Developers", "Permissions"],
  endpoints:   (builder) => ({

    // ── Developers ────────────────────────────────────────────

    listDevelopers: builder.query<ApiResponse<DeveloperRecord[]>, void>({
      query: () => ({ url: "/access/developers", method: "GET" }),
      providesTags: [{ type: "Developers", id: "LIST" }],
    }),

    getDeveloper: builder.query<ApiResponse<DeveloperRecord>, string>({
      query: (id) => ({ url: `/access/developers/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: "Developers", id }],
    }),

    createDeveloper: builder.mutation<
      ApiResponse<{ profile: DeveloperRecord; temp_password?: string }>,
      CreateDeveloperDto
    >({
      query: (data) => ({ url: "/access/developers", method: "POST", data }),
      invalidatesTags: [{ type: "Developers", id: "LIST" }],
    }),

    toggleDeveloperStatus: builder.mutation<
      ApiResponse<DeveloperRecord>,
      { id: string; is_active: boolean }
    >({
      query: ({ id, is_active }) => ({
        url:    `/access/developers/${id}/status`,
        method: "PATCH",
        data:   { is_active },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Developers", id },
        { type: "Developers", id: "LIST" },
      ],
    }),

    deleteDeveloper: builder.mutation<ApiResponse<unknown>, string>({
      query: (id) => ({ url: `/access/developers/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Developers", id },
        { type: "Developers", id: "LIST" },
      ],
    }),

    // ── Admin Management ──────────────────────────────────────

    listAdmins: builder.query<ApiResponse<DeveloperRecord[]>, void>({
      query: () => ({ url: "/access/admins", method: "GET" }),
      providesTags: [{ type: "Developers", id: "ADMINS" }],
    }),

    deleteAdmin: builder.mutation<ApiResponse<unknown>, string>({
      query: (id) => ({ url: `/access/admins/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Developers", id: "ADMINS" }],
    }),

    // ── Page Permissions ──────────────────────────────────────

    getPermissions: builder.query<
      ApiResponse<PagePermissionRecord[]>,
      string
    >({
      query: (developerId) => ({
        url:    `/access/developers/${developerId}/permissions`,
        method: "GET",
      }),
      providesTags: (_r, _e, developerId) => [
        { type: "Permissions", id: developerId },
      ],
    }),

    /** Replace ALL permissions for a developer at once. */
    setAllPermissions: builder.mutation<
      ApiResponse<unknown>,
      { developerId: string; data: UpdatePermissionsDto }
    >({
      query: ({ developerId, data }) => ({
        url:    `/access/developers/${developerId}/permissions`,
        method: "PUT",
        data,
      }),
      invalidatesTags: (_r, _e, { developerId }) => [
        { type: "Permissions", id: developerId },
      ],
    }),

    /** Update a single page permission. */
    upsertPagePermission: builder.mutation<
      ApiResponse<unknown>,
      { developerId: string; pageKey: string; data: UpsertPagePermissionDto }
    >({
      query: ({ developerId, pageKey, data }) => ({
        url:    `/access/developers/${developerId}/permissions/${pageKey}`,
        method: "PATCH",
        data,
      }),
      invalidatesTags: (_r, _e, { developerId }) => [
        { type: "Permissions", id: developerId },
      ],
    }),

    removePagePermission: builder.mutation<
      ApiResponse<unknown>,
      { developerId: string; pageKey: string }
    >({
      query: ({ developerId, pageKey }) => ({
        url:    `/access/developers/${developerId}/permissions/${pageKey}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { developerId }) => [
        { type: "Permissions", id: developerId },
      ],
    }),
  }),
});

// ── Auto-generated hooks ────────────────────────────────────────────────────
export const {
  useListDevelopersQuery,
  useGetDeveloperQuery,
  useCreateDeveloperMutation,
  useToggleDeveloperStatusMutation,
  useDeleteDeveloperMutation,
  useGetPermissionsQuery,
  useSetAllPermissionsMutation,
  useUpsertPagePermissionMutation,
  useRemovePagePermissionMutation,
  useListAdminsQuery,
  useDeleteAdminMutation,
} = accessApi;

// ── Legacy type alias ───────────────────────────────────────────────────────
/** @deprecated Use PagePermissionRecord */
export type PermissionRecord = PagePermissionRecord;
/** @deprecated Use DeveloperRecord */
export type AccessUserRecord = DeveloperRecord;
