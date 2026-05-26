/**
 * accessApi.ts
 * ─────────────────────────────────────────────────────────────
 * RTK Query slice for the role-based access management endpoints
 * exposed by the backend (mounted under `/access/*`).
 *
 *   GET    /access/users?role=...
 *   GET    /access/assignments?developer_id=...
 *   POST   /access/assignments        { developer_id, client_ids[] }
 *   DELETE /access/assignments        { developer_id, client_id  }
 *   GET    /access/permissions/:id
 *   POST   /access/permissions        { user_id, page, can_read, can_write }
 *   DELETE /access/permissions        { user_id, page }
 */

import { createApi } from "@reduxjs/toolkit/query/react"
import { axiosBaseQuery } from "@/src/store/axiosBaseQuery"
import type { ApiResponse } from "@/src/components/work-flow/apiIntegrations/types/integration.types"
import type { AccessRole } from "@/src/store/accessSlice"

// ── Domain Types ────────────────────────────────────────────────────────────

export interface AccessUserRecord {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  company_name?: string | null
  clientkey?: string | null
  role: AccessRole | string
  avatar_url?: string | null
  created_at?: string
}

/**
 * One row from `user_client_access`, joined with both sides.
 * Shape returned by `GET /access/assignments?developer_id=X`:
 *   { id, created_at, user_id, client_user_id, developer: {...}, client: {...} }
 */
export interface AssignmentRecord {
  id: string
  created_at?: string
  user_id: string
  client_user_id: string
  developer: AccessUserRecord
  client: AccessUserRecord
}

export interface PermissionRecord {
  page: string
  can_read: boolean
  can_write: boolean
}

export interface DeveloperPermissionRecord {
  developer_id: string
  client_user_id: string
  page: string
  can_read: boolean
  can_write: boolean
}

// ── API Slice ───────────────────────────────────────────────────────────────

export const accessApi = createApi({
  reducerPath: "accessApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["AccessUsers", "Assignments", "Permissions", "DevPermissions"],
  endpoints: (builder) => ({
    // ── Users ──────────────────────────────────────────────────
    getAccessUsers: builder.query<
      ApiResponse<AccessUserRecord[]>,
      { role?: AccessRole | "admin" | "developer" | "user" } | void
    >({
      query: (arg) => ({
        url: `/access/users`,
        method: "GET",
        params: arg && "role" in arg && arg.role ? { role: arg.role } : undefined,
      }),
      providesTags: (_r, _e, arg) => [
        { type: "AccessUsers" as const, id: (arg && "role" in arg && arg.role) || "ALL" },
      ],
    }),

    // ── Developer ↔ Client Assignments ────────────────────────
    getAssignments: builder.query<
      ApiResponse<AssignmentRecord[]>,
      { developer_id: string }
    >({
      query: ({ developer_id }) => ({
        url: `/access/assignments`,
        method: "GET",
        params: { developer_id },
      }),
      providesTags: (_r, _e, { developer_id }) => [
        { type: "Assignments", id: developer_id },
      ],
    }),

    assignClients: builder.mutation<
      ApiResponse<unknown>,
      { developer_id: string; client_ids: string[] }
    >({
      query: (data) => ({
        url: `/access/assignments`,
        method: "POST",
        data,
      }),
      invalidatesTags: (_r, _e, { developer_id }) => [
        { type: "Assignments", id: developer_id },
      ],
    }),

    revokeAssignment: builder.mutation<
      ApiResponse<unknown>,
      { developer_id: string; client_id: string }
    >({
      query: (data) => ({
        url: `/access/assignments`,
        method: "DELETE",
        data,
      }),
      invalidatesTags: (_r, _e, { developer_id }) => [
        { type: "Assignments", id: developer_id },
      ],
    }),

    // ── Per-page permissions ──────────────────────────────────
    getPermissions: builder.query<
      ApiResponse<PermissionRecord[] | Record<string, { can_read: boolean; can_write: boolean }>>,
      string
    >({
      query: (userId) => ({
        url: `/access/permissions/${userId}`,
        method: "GET",
      }),
      providesTags: (_r, _e, userId) => [{ type: "Permissions", id: userId }],
    }),

    setPermission: builder.mutation<
      ApiResponse<unknown>,
      { user_id: string; page: string; can_read: boolean; can_write: boolean }
    >({
      query: (data) => ({
        url: `/access/permissions`,
        method: "POST",
        data,
      }),
      invalidatesTags: (_r, _e, { user_id }) => [{ type: "Permissions", id: user_id }],
    }),

    removePermission: builder.mutation<
      ApiResponse<unknown>,
      { user_id: string; page: string }
    >({
      query: (data) => ({
        url: `/access/permissions`,
        method: "DELETE",
        data,
      }),
      invalidatesTags: (_r, _e, { user_id }) => [{ type: "Permissions", id: user_id }],
    }),

    // ── Developer-scoped permissions ────────────────────────────
    getDeveloperPermissions: builder.query<
      ApiResponse<DeveloperPermissionRecord[]>,
      { developer_id: string; client_user_id: string }
    >({
      query: ({ developer_id, client_user_id }) => ({
        url: `/access/developer-permissions/${developer_id}/${client_user_id}`,
        method: "GET",
      }),
      providesTags: (_r, _e, { developer_id, client_user_id }) => [
        { type: "DevPermissions", id: `${developer_id}_${client_user_id}` },
      ],
    }),

    setDeveloperPermission: builder.mutation<
      ApiResponse<unknown>,
      { developer_id: string; client_user_id: string; page: string; can_read: boolean; can_write: boolean }
    >({
      query: (data) => ({
        url: `/access/developer-permissions`,
        method: "POST",
        data,
      }),
      invalidatesTags: (_r, _e, { developer_id, client_user_id }) => [
        { type: "DevPermissions", id: `${developer_id}_${client_user_id}` },
      ],
    }),

    removeDeveloperPermission: builder.mutation<
      ApiResponse<unknown>,
      { developer_id: string; client_user_id: string; page: string }
    >({
      query: (data) => ({
        url: `/access/developer-permissions`,
        method: "DELETE",
        data,
      }),
      invalidatesTags: (_r, _e, { developer_id, client_user_id }) => [
        { type: "DevPermissions", id: `${developer_id}_${client_user_id}` },
      ],
    }),
  }),
})

// ── Auto-generated hooks ────────────────────────────────────────────────────
export const {
  useGetAccessUsersQuery,
  useGetAssignmentsQuery,
  useAssignClientsMutation,
  useRevokeAssignmentMutation,
  useGetPermissionsQuery,
  useSetPermissionMutation,
  useRemovePermissionMutation,
  useGetDeveloperPermissionsQuery,
  useSetDeveloperPermissionMutation,
  useRemoveDeveloperPermissionMutation,
} = accessApi
