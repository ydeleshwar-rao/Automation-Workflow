/**
 * authApi.ts
 * ─────────────────────────────────────────────────────────────
 * RTK Query endpoints for signing in and out: email/password login, sign-up,
 * first-admin setup, logout, Google / Microsoft sign-in (SSO) and password reset.
 */

import { baseApi } from "@/src/store/baseApi";
import { API_ROUTES } from "@/src/constants/api.constants";
import type { ApiResponse } from "@/src/components/work-flow/apiIntegrations/types/integration.types";
import type { SsoDiscovery, SsoProvider } from "@/src/lib/auth/provider";

// ── Domain Types ────────────────────────────────────────────────────────────

export interface AuthSessionUser {
  id:               string;
  email:            string;
  role:             string;
  permissions:      string[];
  organization_id?: string;
  organizationId?:  string;
  full_name?:       string;
  avatar_url?:      string | null;
}

/** Returned by every endpoint that signs the user in; tokens themselves travel as HttpOnly cookies. */
export interface AuthSessionResponse {
  access_token?:  string;
  refresh_token?: string;
  expires_in:     number;
  user:           AuthSessionUser;
}

export interface LoginRequest {
  email:    string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  full_name: string;
}

export interface SetupAdminRequest extends RegisterRequest {
  organization_name: string;
}

/** ID token from Google / Microsoft, exchanged with our backend. */
export interface SsoTokenRequest {
  provider:           SsoProvider;
  id_token:           string;
  nonce:              string;
  intent?:            "signin" | "company-setup";
  organization_name?: string;
}

export interface ResetPasswordRequest {
  token:    string;
  password: string;
}

// ── API Slice ───────────────────────────────────────────────────────────────

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<AuthSessionResponse>, LoginRequest>({
      query: (data) => ({ url: API_ROUTES.AUTH.LOGIN, method: "POST", data }),
    }),

    register: builder.mutation<ApiResponse<unknown>, RegisterRequest>({
      query: (data) => ({ url: API_ROUTES.AUTH.REGISTER, method: "POST", data }),
    }),

    setupAdmin: builder.mutation<ApiResponse<AuthSessionResponse>, SetupAdminRequest>({
      query: (data) => ({ url: API_ROUTES.AUTH.SETUP, method: "POST", data }),
    }),

    logout: builder.mutation<ApiResponse<unknown>, void>({
      query: () => ({ url: API_ROUTES.AUTH.LOGOUT, method: "POST" }),
    }),

    // ── Google / Microsoft sign-in ────────────────────────────

    ssoSignIn: builder.mutation<ApiResponse<AuthSessionResponse>, SsoTokenRequest>({
      query: (data) => ({ url: API_ROUTES.SSO.CALLBACK, method: "POST", data }),
    }),

    /** Admin links a company Google Workspace / Microsoft 365 account to the current workspace. */
    connectSso: builder.mutation<ApiResponse<unknown>, SsoTokenRequest>({
      query: (data) => ({ url: API_ROUTES.SSO.CONNECT, method: "POST", data }),
    }),

    discoverCompanySso: builder.query<ApiResponse<SsoDiscovery>, string>({
      query: (email) => ({ url: API_ROUTES.SSO.DISCOVER, method: "GET", params: { email } }),
    }),

    // ── Password reset ────────────────────────────────────────

    requestPasswordReset: builder.mutation<ApiResponse<unknown>, string>({
      query: (email) => ({ url: API_ROUTES.AUTH.FORGOT_PASSWORD, method: "POST", data: { email } }),
    }),

    resetPassword: builder.mutation<ApiResponse<unknown>, ResetPasswordRequest>({
      query: (data) => ({ url: API_ROUTES.AUTH.RESET_PASSWORD, method: "POST", data }),
    }),
  }),
});

// ── Auto-generated hooks ────────────────────────────────────────────────────
export const {
  useLoginMutation,
  useRegisterMutation,
  useSetupAdminMutation,
  useLogoutMutation,
} = authApi;
