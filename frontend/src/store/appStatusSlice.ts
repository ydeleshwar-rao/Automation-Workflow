/**
 * appStatusSlice.ts
 * ─────────────────────────────────────────────────────────────
 * Tracks which third-party integrations are currently connected
 * for the logged-in user (per-user, not per-client).
 *
 * Architecture change:
 *   - Removed clientkey header — all requests use the JWT Bearer token only
 *   - Status is user-scoped (each user has their own integration credentials)
 */

import {
  createSlice,
  createAsyncThunk,
  createSelector,
  PayloadAction,
} from "@reduxjs/toolkit";
import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppId = "servicem8" | "commusoft" | "leadshub" | "simpro";

export interface AppStatusState {
  servicem8:           boolean;
  servicem8NeedsReauth: boolean;
  commusoft:           boolean;
  leadshub:            boolean;
  simpro:              boolean;
  isLoading:           boolean;
  hasLoadedOnce:       boolean;
  /** Only the most recent requestId's response is applied — prevents races. */
  lastRequestId:       string | null;
  /** Currently focused integration in the dashboard. */
  activeApp:           AppId | null;
}

const initialState: AppStatusState = {
  servicem8:            false,
  servicem8NeedsReauth: false,
  commusoft:            false,
  leadshub:             false,
  simpro:               false,
  isLoading:            false,
  hasLoadedOnce:        false,
  lastRequestId:        null,
  activeApp:            null,
};

// Priority order when auto-picking activeApp
const APP_PRIORITY: readonly AppId[] = ["servicem8", "commusoft", "simpro", "leadshub"];

// ── Helpers ───────────────────────────────────────────────────────────────────

interface StatusResponse {
  connected?:        boolean;
  alreadyConnected?: boolean;
  needs_reauth?:     boolean;
  data?: {
    connected?:        boolean;
    alreadyConnected?: boolean;
    needs_reauth?:     boolean;
  };
}

const parseConnected = (res: StatusResponse | null | undefined): boolean =>
  res?.data?.connected === true ||
  res?.data?.alreadyConnected === true ||
  res?.connected === true ||
  res?.alreadyConnected === true;

const parseNeedsReauth = (res: StatusResponse | null | undefined): boolean =>
  res?.data?.needs_reauth === true || res?.needs_reauth === true;

/** Fetch a single integration status. No clientkey — JWT-only. */
const fetchOne = async (endpoint: string): Promise<boolean> => {
  try {
    const { data } = await axiosInstance.get(endpoint);
    return parseConnected(data);
  } catch {
    return false;
  }
};

const fetchServiceM8Status = async (
  endpoint: string,
): Promise<{ connected: boolean; needsReauth: boolean }> => {
  try {
    const { data } = await axiosInstance.get(endpoint);
    const connected   = parseConnected(data);
    const needsReauth = connected && parseNeedsReauth(data);
    return { connected: connected && !needsReauth, needsReauth };
  } catch {
    return { connected: false, needsReauth: false };
  }
};

// ── Thunk: fetch all integration statuses in parallel ────────────────────────

type AppFlags = Pick<
  AppStatusState,
  "servicem8" | "servicem8NeedsReauth" | "commusoft" | "leadshub" | "simpro"
>;

export const fetchAppStatus = createAsyncThunk<
  AppFlags,
  void,
  { state: { appStatus: AppStatusState } }
>("appStatus/fetchAll", async () => {
  const [sm8, commusoft, leadshub, simpro] = await Promise.all([
    fetchServiceM8Status(API_ROUTES.SERVICEM8.STATUS),
    fetchOne(API_ROUTES.COMMUSOFT.STATUS),
    fetchOne(API_ROUTES.GHL.STATUS),
    fetchOne(API_ROUTES.SIMPRO.STATUS),
  ]);
  return {
    servicem8:            sm8.connected,
    servicem8NeedsReauth: sm8.needsReauth,
    commusoft,
    leadshub,
    simpro,
  };
});

// ── Slice ─────────────────────────────────────────────────────────────────────

const appStatusSlice = createSlice({
  name: "appStatus",
  initialState,
  reducers: {
    resetAppStatus: () => initialState,
    setAppConnected(
      state,
      action: PayloadAction<{ app: AppId; connected: boolean }>,
    ) {
      state[action.payload.app] = action.payload.connected;
    },
    setActiveApp(state, action: PayloadAction<AppId | null>) {
      state.activeApp = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppStatus.pending, (state, action) => {
        state.isLoading    = true;
        state.lastRequestId = action.meta.requestId;
      })
      .addCase(fetchAppStatus.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return;
        state.isLoading           = false;
        state.hasLoadedOnce       = true;
        state.servicem8           = action.payload.servicem8;
        state.servicem8NeedsReauth = action.payload.servicem8NeedsReauth;
        state.commusoft           = action.payload.commusoft;
        state.leadshub            = action.payload.leadshub;
        state.simpro              = action.payload.simpro;

        // Auto-pick activeApp
        const isConnected = (app: AppId): boolean => action.payload[app];
        if (state.activeApp && !isConnected(state.activeApp)) {
          state.activeApp = null;
        }
        if (!state.activeApp) {
          const next = APP_PRIORITY.find(isConnected);
          state.activeApp = next ?? null;
        }
      })
      .addCase(fetchAppStatus.rejected, (state, action) => {
        if (action.meta.requestId !== state.lastRequestId) return;
        state.isLoading     = false;
        state.hasLoadedOnce = true;
      });
  },
});

export const { resetAppStatus, setAppConnected, setActiveApp } =
  appStatusSlice.actions;
export default appStatusSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────

type HasAppStatus = { appStatus: AppStatusState };

export const selectAppStatus           = (s: HasAppStatus) => s.appStatus;
export const selectIsServiceM8Connected = (s: HasAppStatus) => s.appStatus.servicem8;
export const selectServiceM8NeedsReauth = (s: HasAppStatus) => s.appStatus.servicem8NeedsReauth;
export const selectIsCommusoftConnected = (s: HasAppStatus) => s.appStatus.commusoft;
export const selectIsLeadsHubConnected  = (s: HasAppStatus) => s.appStatus.leadshub;
export const selectIsSimProConnected    = (s: HasAppStatus) => s.appStatus.simpro;
export const selectAppStatusLoading     = (s: HasAppStatus) => s.appStatus.isLoading;
export const selectAppStatusLoaded      = (s: HasAppStatus) => s.appStatus.hasLoadedOnce;
export const selectActiveApp            = (s: HasAppStatus) => s.appStatus.activeApp;

export const selectConnectedServices = createSelector(
  [
    selectIsServiceM8Connected,
    selectIsCommusoftConnected,
    selectIsLeadsHubConnected,
    selectIsSimProConnected,
  ],
  (sm8, cs, lh, sp): string[] => {
    const out: string[] = [];
    if (sm8) out.push("servicem8");
    if (cs)  out.push("commusoft");
    if (lh)  out.push("leadshub");
    if (sp)  out.push("simpro");
    return out;
  },
);
