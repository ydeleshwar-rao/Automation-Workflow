import { createSlice, createAsyncThunk, createSelector, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "@/src/services/apiClient";
import { API_ROUTES } from "@/src/constants/api.constants";
import { getActiveClientKey } from "@/src/store/localStorage";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppId = "servicem8" | "commusoft" | "leadshub" | "simpro";

export interface AppStatusState {
  servicem8: boolean;
  servicem8NeedsReauth: boolean;
  commusoft: boolean;
  leadshub: boolean;
  simpro: boolean;
  isLoading: boolean;
  hasLoadedOnce: boolean;
  // Request ID of the most recently dispatched fetch. Only that request's
  // response is allowed to update flags — older in-flight responses are ignored,
  // which prevents a pre-connect fetch from overwriting a post-connect refetch.
  lastRequestId: string | null;
  // Currently focused integration — drives the dashboard's data source.
  // null until the user has any connected app, then defaults to the first
  // connected app on `fetchAppStatus.fulfilled` (see reducer below).
  activeApp: AppId | null;
}

const initialState: AppStatusState = {
  servicem8: false,
  servicem8NeedsReauth: false,
  commusoft: false,
  leadshub: false,
  simpro: false,
  isLoading: false,
  hasLoadedOnce: false,
  lastRequestId: null,
  activeApp: null,
};

// Priority order used when auto-picking a default activeApp. Earlier entries
// win — keeps the dashboard pointed at the most "data-rich" integration.
const APP_PRIORITY: readonly AppId[] = ["servicem8", "commusoft", "simpro", "leadshub"];

// ── Helpers ───────────────────────────────────────────────────────────────────

interface StatusResponse {
  connected?: boolean;
  alreadyConnected?: boolean;
  needs_reauth?: boolean;
  data?: { connected?: boolean; alreadyConnected?: boolean; needs_reauth?: boolean };
}

// All four backends wrap the payload as `{ success, message, data: { connected } }`
// (see utils/ApiResponse.ts on the backend). Do NOT use the outer `success` flag
// as a connection signal — it only reports HTTP success.
const parseConnected = (res: StatusResponse | null | undefined): boolean =>
  res?.data?.connected === true ||
  res?.data?.alreadyConnected === true ||
  res?.connected === true ||
  res?.alreadyConnected === true;

const parseNeedsReauth = (res: StatusResponse | null | undefined): boolean =>
  res?.data?.needs_reauth === true || res?.needs_reauth === true;

const fetchOne = async (endpoint: string, clientkey: string): Promise<boolean> => {
  try {
    const { data } = await axiosInstance.get(endpoint, { headers: { clientkey } });
    return parseConnected(data);
  } catch {
    return false;
  }
};

const fetchServiceM8Status = async (
  endpoint: string,
  clientkey: string,
): Promise<{ connected: boolean; needsReauth: boolean }> => {
  try {
    const { data } = await axiosInstance.get(endpoint, { headers: { clientkey } });
    const connected = parseConnected(data);
    const needsReauth = connected && parseNeedsReauth(data);
    return { connected: connected && !needsReauth, needsReauth };
  } catch {
    return { connected: false, needsReauth: false };
  }
};

// ── Thunk: fetch all statuses in parallel ────────────────────────────────────

type AppFlags = Pick<AppStatusState, "servicem8" | "servicem8NeedsReauth" | "commusoft" | "leadshub" | "simpro">;

export const fetchAppStatus = createAsyncThunk<
  AppFlags,
  void,
  { state: { appStatus: AppStatusState } }
>("appStatus/fetchAll", async () => {
  const clientkey = getActiveClientKey() || "";
  if (!clientkey) {
    return { servicem8: false, servicem8NeedsReauth: false, commusoft: false, leadshub: false, simpro: false };
  }
  const [sm8, commusoft, leadshub, simpro] = await Promise.all([
    fetchServiceM8Status(API_ROUTES.SERVICEM8.STATUS, clientkey),
    fetchOne(API_ROUTES.COMMUSOFT.STATUS, clientkey),
    fetchOne(API_ROUTES.GHL.STATUS, clientkey),
    fetchOne(API_ROUTES.SIMPRO.STATUS, clientkey),
  ]);
  return { servicem8: sm8.connected, servicem8NeedsReauth: sm8.needsReauth, commusoft, leadshub, simpro };
});
// NOTE: no `condition` guard here. A user's post-connect refetch must not be
// dropped just because an earlier fetch is still in flight. The reducer below
// uses `lastRequestId` so only the most recent dispatch's response wins.

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
    /**
     * Manual override for the dashboard's active integration. Pass `null` to
     * fall back to auto-selection on the next status refresh.
     */
    setActiveApp(state, action: PayloadAction<AppId | null>) {
      state.activeApp = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppStatus.pending, (state, action) => {
        state.isLoading = true;
        state.lastRequestId = action.meta.requestId;
      })
      .addCase(fetchAppStatus.fulfilled, (state, action) => {
        // Ignore stale responses — only the most recent dispatch wins.
        if (action.meta.requestId !== state.lastRequestId) return;
        state.isLoading = false;
        state.hasLoadedOnce = true;
        state.servicem8 = action.payload.servicem8;
        state.servicem8NeedsReauth = action.payload.servicem8NeedsReauth;
        state.commusoft = action.payload.commusoft;
        state.leadshub = action.payload.leadshub;
        state.simpro = action.payload.simpro;

        // Auto-pick / re-pick activeApp:
        //   1) if current active app is no longer connected, drop it
        //   2) if no active app is set and at least one is connected, pick the
        //      highest-priority connected app
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
        state.isLoading = false;
        state.hasLoadedOnce = true;
      });
  },
});

export const { resetAppStatus, setAppConnected, setActiveApp } = appStatusSlice.actions;
export default appStatusSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────

type HasAppStatus = { appStatus: AppStatusState };

export const selectAppStatus = (s: HasAppStatus) => s.appStatus;
export const selectIsServiceM8Connected = (s: HasAppStatus) => s.appStatus.servicem8;
export const selectServiceM8NeedsReauth = (s: HasAppStatus) => s.appStatus.servicem8NeedsReauth;
export const selectIsCommusoftConnected = (s: HasAppStatus) => s.appStatus.commusoft;
export const selectIsLeadsHubConnected = (s: HasAppStatus) => s.appStatus.leadshub;
export const selectIsSimProConnected = (s: HasAppStatus) => s.appStatus.simpro;
export const selectAppStatusLoading = (s: HasAppStatus) => s.appStatus.isLoading;
export const selectAppStatusLoaded = (s: HasAppStatus) => s.appStatus.hasLoadedOnce;
export const selectActiveApp = (s: HasAppStatus) => s.appStatus.activeApp;

// Memoized so it returns the same array reference until one of the four flags
// actually changes — prevents spurious re-renders in every useSelector consumer.
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
    if (cs) out.push("commusoft");
    if (lh) out.push("leadshub");
    if (sp) out.push("simpro");
    return out;
  },
);
