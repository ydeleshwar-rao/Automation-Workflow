/**
 * companySsoApi.ts
 * ─────────────────────────────────────────────────────────────
 * RTK Query endpoints for the admin "Company SSO" page: read the workspace's SSO
 * settings, require SSO, and disconnect a linked company account.
 * (Linking a new account goes through Google / Microsoft — see authApi.connectSso.)
 */

import { baseApi } from "@/src/store/baseApi";
import { API_ROUTES } from "@/src/constants/api.constants";
import type { ApiResponse } from "@/src/components/work-flow/apiIntegrations/types/integration.types";
import type { SsoProvider } from "@/src/lib/auth/provider";

// ── Domain Types ────────────────────────────────────────────────────────────

export interface SsoConnection {
  id:        string;
  provider:  SsoProvider;
  domain:    string;
  tenantKey: string;
  createdAt: string;
}

export interface SsoSettings {
  organization:  { id: string; name: string; type: "individual" | "company"; ssoRequired: boolean };
  connections:   SsoConnection[];
  canRequireSso: boolean;
}

type SsoSettingsResponse = ApiResponse<SsoSettings>;

// ── API Slice ───────────────────────────────────────────────────────────────

const ssoSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSsoSettings: builder.query<SsoSettingsResponse, void>({
      query: () => ({ url: API_ROUTES.SSO.SETTINGS, method: "GET" }),
    }),
  }),
});

/**
 * Both mutations answer with the updated settings, so the cache is written directly instead of refetched.
 * A failed mutation is reported to the caller through `.unwrap()`, so it is ignored here.
 */
async function storeSettingsFromResponse(
  queryFulfilled: Promise<{ data: SsoSettingsResponse }>,
  dispatch: (action: ReturnType<typeof ssoSettingsApi.util.upsertQueryData>) => unknown,
): Promise<void> {
  try {
    const { data } = await queryFulfilled;
    dispatch(ssoSettingsApi.util.upsertQueryData("getSsoSettings", undefined, data));
  } catch {
    // handled by the caller
  }
}

export const companySsoApi = ssoSettingsApi.injectEndpoints({
  endpoints: (builder) => ({
    updateSsoRequired: builder.mutation<SsoSettingsResponse, boolean>({
      query: (isSsoRequired) => ({
        url:    API_ROUTES.SSO.SETTINGS,
        method: "PATCH",
        data:   { sso_required: isSsoRequired },
      }),
      onQueryStarted: (_isSsoRequired, { dispatch, queryFulfilled }) =>
        storeSettingsFromResponse(queryFulfilled, dispatch),
    }),

    deleteSsoConnection: builder.mutation<SsoSettingsResponse, string>({
      query: (connectionId) => ({ url: API_ROUTES.SSO.CONNECTION(connectionId), method: "DELETE" }),
      onQueryStarted: (_connectionId, { dispatch, queryFulfilled }) =>
        storeSettingsFromResponse(queryFulfilled, dispatch),
    }),
  }),
});

export const {
  useGetSsoSettingsQuery,
  useUpdateSsoRequiredMutation,
  useDeleteSsoConnectionMutation,
} = companySsoApi;
