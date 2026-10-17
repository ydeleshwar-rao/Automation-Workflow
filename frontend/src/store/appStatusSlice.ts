/**
 * appStatusSlice.ts
 * ─────────────────────────────────────────────────────────────
 * UI state for the integration shown on the dashboard, plus selectors over the
 * integration statuses cached by RTK Query (`integrationsApi.getIntegrationStatuses`).
 * Connection status itself is server state and lives only in the RTK Query cache.
 */

import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { QueryStatus } from "@reduxjs/toolkit/query";
import {
  DISCONNECTED_STATUS,
  INTEGRATION_APP_IDS,
  integrationsApi,
  type IntegrationAppId,
  type IntegrationStatusMap,
} from "@/src/components/app-connections/apiIntegrations/integrationsApi";
import type { AppDispatch } from "./store";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AppId = IntegrationAppId;

export interface AppStatusState {
  /** Integration the user picked in the dashboard switcher (may since have been disconnected). */
  selectedApp: AppId | null;
}

const initialState: AppStatusState = {
  selectedApp: null,
};

// Priority order when auto-picking the active app
const APP_PRIORITY: readonly AppId[] = ["servicem8", "commusoft", "simpro", "leadshub"];

const DISCONNECTED_STATUSES = Object.fromEntries(
  INTEGRATION_APP_IDS.map((appId) => [appId, DISCONNECTED_STATUS]),
) as IntegrationStatusMap;

// ── Slice ─────────────────────────────────────────────────────────────────────

const appStatusSlice = createSlice({
  name: "appStatus",
  initialState,
  reducers: {
    clearSelectedApp: () => initialState,
    setActiveApp(state, action: PayloadAction<AppId | null>) {
      state.selectedApp = action.payload;
    },
  },
});

export const { setActiveApp } = appStatusSlice.actions;
export default appStatusSlice.reducer;

/**
 * Logout: forget the selected app and mark every integration disconnected, so the
 * next user never sees the previous user's statuses before their own load.
 */
export const resetAppStatus = () => (dispatch: AppDispatch) => {
  dispatch(appStatusSlice.actions.clearSelectedApp());
  dispatch(integrationsApi.util.upsertQueryData("getIntegrationStatuses", undefined, DISCONNECTED_STATUSES));
};

// ── Selectors ─────────────────────────────────────────────────────────────────

const selectStatusesFromIntegrationsState = integrationsApi.endpoints.getIntegrationStatuses.select();

type IntegrationsApiState = Parameters<typeof selectStatusesFromIntegrationsState>[0];

interface HasAppStatus {
  api: unknown;
  appStatus: AppStatusState;
}

// The store's RootState types `api` from the bare baseApi (without injected tag types);
// at runtime it is the same cache slice, so the cast only bridges the static types.
const selectIntegrationStatusesResult = (state: HasAppStatus) =>
  selectStatusesFromIntegrationsState(state as IntegrationsApiState);

const selectIntegrationStatuses = (state: HasAppStatus): IntegrationStatusMap =>
  selectIntegrationStatusesResult(state).data ?? DISCONNECTED_STATUSES;

const selectSelectedApp = (state: HasAppStatus) => state.appStatus.selectedApp;

/** Connected flag per integration, e.g. `{ servicem8: true, commusoft: false, … }`. */
export const selectAppStatus = createSelector(
  [selectIntegrationStatuses],
  (statuses) =>
    Object.fromEntries(
      INTEGRATION_APP_IDS.map((appId) => [appId, statuses[appId].isConnected]),
    ) as Record<AppId, boolean>,
);

export const selectAppStatusLoading = (state: HasAppStatus): boolean =>
  selectIntegrationStatusesResult(state).status === QueryStatus.pending;

export const selectAppStatusLoaded = (state: HasAppStatus): boolean => {
  const statusesResult = selectIntegrationStatusesResult(state);
  return statusesResult.data !== undefined || statusesResult.isError;
};

/** The user's pick while it stays connected, otherwise the highest-priority connected app. */
export const selectActiveApp = createSelector(
  [selectSelectedApp, selectAppStatus],
  (selectedApp, connectedApps): AppId | null => {
    if (selectedApp && connectedApps[selectedApp]) return selectedApp;
    return APP_PRIORITY.find((appId) => connectedApps[appId]) ?? null;
  },
);
