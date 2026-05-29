import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit"
import axios from "axios"
import axiosInstance from "@/src/services/apiClient"
import { API_ROUTES } from "@/src/constants/api.constants"
import { loadSession } from "./localStorage"

// ── Types ─────────────────────────────────────────────────────────────────────

export type AccessRole = "admin" | "developer"

export interface AccessUser {
  id:          string
  email:       string
  role:        AccessRole
  permissions: string[]   // page keys or ['*'] for admin
}

export interface PagePermission {
  can_view:   boolean
  can_edit:   boolean
  can_delete: boolean
}

export interface AccessState {
  user:        AccessUser | null
  permissions: Record<string, PagePermission>  // page_key → permission
  status:      "idle" | "loading" | "ready" | "error"
  error:       string | null
}

const initialState: AccessState = {
  user:        null,
  permissions: {},
  status:      "idle",
  error:       null,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalize backend page_permissions array → Record<page_key, PagePermission>
 * Backend returns: [{ page_key, can_view, can_edit, can_delete }]
 */
function normalizePermissions(raw: unknown): Record<string, PagePermission> {
  if (!raw || !Array.isArray(raw)) return {}
  return raw.reduce<Record<string, PagePermission>>((acc, item) => {
    const key = (item as { page_key?: string; pageKey?: string }).page_key
                ?? (item as { pageKey?: string }).pageKey
    if (!key) return acc
    acc[key] = {
      can_view:   !!(item as { can_view?: boolean }).can_view,
      can_edit:   !!(item as { can_edit?: boolean }).can_edit,
      can_delete: !!(item as { can_delete?: boolean }).can_delete,
    }
    return acc
  }, {})
}

/**
 * Check if a user has access to a page.
 * Admin: always true (permissions = ['*'])
 * Developer: only if page_key is in their permissions
 */
export function hasPageAccess(permissions: string[], pageKey: string): boolean {
  return permissions.includes("*") || permissions.includes(pageKey)
}

// ── Thunk: bootstrap from JWT + optional API call ────────────────────────────

/**
 * Bootstrap access state.
 * 1. Read user + role + permissions from stored JWT (no API call for admin)
 * 2. For developer: optionally re-fetch permissions from API to get can_edit/can_delete
 */
export const bootstrapAccess = createAsyncThunk<
  { user: AccessUser; permissions: Record<string, PagePermission> },
  void,
  { rejectValue: string }
>("access/bootstrap", async (_, { rejectWithValue }) => {
  try {
    // Step 1: Get user info from stored session (JWT already decoded on login)
    const session = loadSession()
    if (!session?.userId) throw new Error("No session found — please log in")

    const user: AccessUser = {
      id:          session.userId,
      email:       session.email,
      role:        session.role as AccessRole,
      permissions: session.permissions,
    }

    // Step 2: Fetch detailed permissions (can_view/can_edit/can_delete) from API
    // Admin: skip (has ['*'], can do everything)
    // Developer: fetch their specific page permissions
    let permissions: Record<string, PagePermission> = {}

    if (user.role === "developer") {
      try {
        const res = await axiosInstance.get(API_ROUTES.ACCESS.PERMISSIONS(user.id))
        permissions = normalizePermissions(res.data?.data ?? res.data)
      } catch {
        // Gracefully degrade — use JWT permissions array for view access at minimum
        permissions = user.permissions.reduce<Record<string, PagePermission>>((acc, key) => {
          if (key !== "*") {
            acc[key] = { can_view: true, can_edit: false, can_delete: false }
          }
          return acc
        }, {})
      }
    }

    return { user, permissions }
  } catch (err: unknown) {
    const message = axios.isAxiosError(err)
      ? err.response?.data?.message ?? err.message
      : err instanceof Error
      ? err.message
      : "Failed to bootstrap access"
    return rejectWithValue(message)
  }
})

// ── Slice ─────────────────────────────────────────────────────────────────────

const accessSlice = createSlice({
  name: "access",
  initialState,
  reducers: {
    /** Called after login — seed state directly from login response (no extra API call). */
    setUserFromLogin(
      state,
      action: PayloadAction<{ user: AccessUser; permissions?: Record<string, PagePermission> }>
    ) {
      state.user        = action.payload.user
      state.permissions = action.payload.permissions ?? {}
      state.status      = "ready"
    },
    clearAccess() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAccess.pending, (state) => {
        state.status = "loading"
        state.error  = null
      })
      .addCase(bootstrapAccess.fulfilled, (state, action) => {
        state.status      = "ready"
        state.user        = action.payload.user
        state.permissions = action.payload.permissions
      })
      .addCase(bootstrapAccess.rejected, (state, action) => {
        state.status = "error"
        state.error  = action.payload ?? "Bootstrap failed"
      })
  },
})

export const { setUserFromLogin, clearAccess } = accessSlice.actions
export default accessSlice.reducer
