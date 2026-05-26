import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit"
import axios from "axios"
import axiosInstance from "@/src/services/apiClient"
import { API_ROUTES } from "@/src/constants/api.constants"
import {
  loadSelectedClientId,
  saveSelectedClientId,
  saveSelectedClientProfile,
  clearSelectedClientProfile,
  type SelectedClientProfile,
} from "./localStorage"

// ── Types ─────────────────────────────────────────────────────────────────────

export type AccessRole = "admin" | "developer" | "user"

export interface AccessUser {
  id: string
  email: string
  role: AccessRole
}

export interface AccessClient {
  id: string
  email: string
  name?: string
  company_name?: string
  clientkey?: string
}

export interface PagePermission {
  can_read: boolean
  can_write: boolean
}

export interface AccessState {
  user: AccessUser | null
  accessibleClients: AccessClient[]
  selectedClientId: string | null
  selectedClientProfile: SelectedClientProfile | null
  permissions: Record<string, PagePermission>
  status: "idle" | "loading" | "ready" | "error"
  error: string | null
}

const initialState: AccessState = {
  user: null,
  accessibleClients: [],
  selectedClientId: null,
  selectedClientProfile: null,
  permissions: {},
  status: "idle",
  error: null,
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// All requests below go through axiosInstance, which auto-attaches the Bearer
// header and refreshes the access token on 401.

function normalizePermissions(
  raw: unknown,
): Record<string, PagePermission> {
  if (!raw) return {}
  if (Array.isArray(raw)) {
    return raw.reduce<Record<string, PagePermission>>((acc, item) => {
      const page = (item as { page?: string }).page
      if (!page) return acc
      acc[page] = {
        can_read: !!(item as { can_read?: boolean }).can_read,
        can_write: !!(item as { can_write?: boolean }).can_write,
      }
      return acc
    }, {})
  }
  if (typeof raw === "object") {
    return raw as Record<string, PagePermission>
  }
  return {}
}

function pickInitialClientId(
  role: AccessRole,
  userId: string,
  clients: AccessClient[],
): string | null {
  if (role === "user") return userId
  const stored = loadSelectedClientId()
  const validStored = stored && clients.some((c) => c.id === stored) ? stored : null
  // developer & admin — only restore a previously stored choice, never auto-select.
  // The developer must explicitly pick a client first.
  return validStored
}

// ── Thunk: bootstrap access state from backend ───────────────────────────────

export const bootstrapAccess = createAsyncThunk<
  {
    user: AccessUser
    clients: AccessClient[]
    selectedClientId: string | null
    selectedClientProfile: SelectedClientProfile | null
    permissions: Record<string, PagePermission>
  },
  void,
  { rejectValue: string }
>("access/bootstrap", async (_, { rejectWithValue }) => {
  try {
    const [meRes, clientsRes] = await Promise.all([
      axiosInstance.get(API_ROUTES.ACCESS.ME),
      axiosInstance.get(API_ROUTES.ACCESS.CLIENTS),
    ])

    // Backend returns { user_id, email, role } — normalize to { id, email, role }
    const meRaw = meRes.data?.data ?? meRes.data
    const user: AccessUser = {
      id: meRaw.user_id ?? meRaw.id,
      email: meRaw.email,
      role: meRaw.role,
    }

    // Normalize backend profile shape (first_name/last_name) → AccessClient.name
    const rawClients = ((clientsRes.data?.data ?? clientsRes.data) ?? []) as Array<
      AccessClient & { first_name?: string; last_name?: string }
    >
    const clients: AccessClient[] = rawClients.map((c) => ({
      id: c.id,
      email: c.email,
      name:
        c.name ||
        [c.first_name, c.last_name].filter(Boolean).join(" ") ||
        undefined,
      company_name: c.company_name,
      clientkey: c.clientkey,
    }))

    const selectedClientId = pickInitialClientId(user.role, user.id, clients)

    // Fetch permissions based on role
    let permissions: Record<string, PagePermission> = {}
    if (user.role === "developer" && selectedClientId) {
      // Developer: fetch per-client permissions
      try {
        const permsRes = await axiosInstance.get(
          API_ROUTES.ACCESS.DEVELOPER_PERMISSIONS(user.id, selectedClientId),
        )
        permissions = normalizePermissions(permsRes.data?.data ?? permsRes.data)
      } catch {
        // No developer permissions configured yet
      }
    } else if (user.role !== "developer") {
      // Admin or user: fetch global permissions
      try {
        const permsRes = await axiosInstance.get(API_ROUTES.ACCESS.PERMISSIONS(user.id))
        permissions = normalizePermissions(permsRes.data?.data ?? permsRes.data)
      } catch {
        // Non-admin roles may get 403 — use empty permissions
      }
    }

    saveSelectedClientId(selectedClientId)

    // Persist selected client profile for display in UI
    let selectedClientProfile: SelectedClientProfile | null = null
    if (selectedClientId) {
      const match = clients.find((c) => c.id === selectedClientId)
      if (match) {
        selectedClientProfile = {
          id: match.id,
          email: match.email,
          name: match.name,
          companyName: match.company_name,
          clientKey: match.clientkey,
        }
        saveSelectedClientProfile(selectedClientProfile)
      }
    }
    return { user, clients, selectedClientId, selectedClientProfile, permissions }
  } catch (err: unknown) {
    const message = axios.isAxiosError(err)
      ? err.response?.data?.message ?? err.message
      : err instanceof Error
      ? err.message
      : "Failed to load access"
    return rejectWithValue(message)
  }
})

// ── Slice ─────────────────────────────────────────────────────────────────────

const accessSlice = createSlice({
  name: "access",
  initialState,
  reducers: {
    setSelectedClient(
      state,
      action: PayloadAction<{ id: string | null; profile?: SelectedClientProfile | null }>
    ) {
      state.selectedClientId = action.payload.id
      state.selectedClientProfile = action.payload.profile ?? null
      saveSelectedClientId(action.payload.id)
      saveSelectedClientProfile(action.payload.profile ?? null)
    },
    clearAccess() {
      saveSelectedClientId(null)
      clearSelectedClientProfile()
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAccess.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(bootstrapAccess.fulfilled, (state, action) => {
        state.status = "ready"
        state.user = action.payload.user
        state.accessibleClients = action.payload.clients
        state.selectedClientId = action.payload.selectedClientId
        state.selectedClientProfile = action.payload.selectedClientProfile
        state.permissions = action.payload.permissions
      })
      .addCase(bootstrapAccess.rejected, (state, action) => {
        state.status = "error"
        state.error = action.payload ?? "Bootstrap failed"
      })
  },
})

export const { setSelectedClient, clearAccess } = accessSlice.actions
export default accessSlice.reducer
