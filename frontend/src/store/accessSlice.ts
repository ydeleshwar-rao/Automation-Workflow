import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit"
import { accessApi } from "@/src/components/admin/access/apiIntegrations/accessApi"
import { getApiErrorMessage } from "@/src/lib/api-error"
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

/** Admins carry this single entry instead of a page list. */
const ALL_PAGES_PERMISSION = "*"

type PagePermissionItem = {
  page_key?:   string
  pageKey?:    string
  can_view?:   boolean
  can_edit?:   boolean
  can_delete?: boolean
}

/**
 * Normalize backend page_permissions array → Record<page_key, PagePermission>
 * Backend returns: [{ page_key, can_view, can_edit, can_delete }]
 */
function normalizePermissions(items: unknown): Record<string, PagePermission> {
  if (!Array.isArray(items)) return {}
  return items.reduce<Record<string, PagePermission>>((permissionsByPage, item: PagePermissionItem) => {
    const pageKey = item.page_key ?? item.pageKey
    if (!pageKey) return permissionsByPage
    permissionsByPage[pageKey] = {
      can_view:   !!item.can_view,
      can_edit:   !!item.can_edit,
      can_delete: !!item.can_delete,
    }
    return permissionsByPage
  }, {})
}

/** View-only access to every page listed in the session token (used when the detailed fetch fails). */
function viewOnlyPermissions(pageKeys: string[]): Record<string, PagePermission> {
  return pageKeys.reduce<Record<string, PagePermission>>((permissionsByPage, pageKey) => {
    if (pageKey !== ALL_PAGES_PERMISSION) {
      permissionsByPage[pageKey] = { can_view: true, can_edit: false, can_delete: false }
    }
    return permissionsByPage
  }, {})
}

/**
 * Check if a user has access to a page.
 * Admin: always true (permissions = ['*'])
 * Developer: only if page_key is in their permissions
 */
export function hasPageAccess(permissions: string[], pageKey: string): boolean {
  return permissions.includes(ALL_PAGES_PERMISSION) || permissions.includes(pageKey)
}

function readSessionUser(): AccessUser {
  const session = loadSession()
  if (!session?.userId) throw new Error("No session found — please log in")
  return {
    id:          session.userId,
    email:       session.email,
    role:        session.role as AccessRole,
    permissions: session.permissions,
  }
}

// ── Thunk: bootstrap from stored session + RTK Query permissions ─────────────

/**
 * Bootstrap access state.
 * 1. Read user + role + permissions from the stored session (no API call for admin)
 * 2. For developer: fetch page permissions (can_view/can_edit/can_delete) through accessApi
 */
export const bootstrapAccess = createAsyncThunk<
  { user: AccessUser; permissions: Record<string, PagePermission> },
  void,
  { rejectValue: string }
>("access/bootstrap", async (_, { dispatch, rejectWithValue }) => {
  let user: AccessUser
  try {
    user = readSessionUser()
  } catch (error: unknown) {
    return rejectWithValue(getApiErrorMessage(error, "Failed to bootstrap access"))
  }

  // Admin has ['*'] and can do everything, so only developers need the detailed list
  if (user.role !== "developer") return { user, permissions: {} }

  try {
    const response = await dispatch(
      accessApi.endpoints.getPermissions.initiate(user.id, { subscribe: false, forceRefetch: true }),
    ).unwrap()
    return { user, permissions: normalizePermissions(response.data) }
  } catch {
    // Degrade gracefully: the session's page list still grants view access
    return { user, permissions: viewOnlyPermissions(user.permissions) }
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
