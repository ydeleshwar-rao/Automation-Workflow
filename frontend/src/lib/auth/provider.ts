/**
 * Auth flows that don't go through our backend's email/password login:
 * Google / Microsoft sign-in, company SSO and password reset.
 *
 * Sign-in uses the OpenID Connect ID-token flow verified by our backend (/sso/*);
 * password reset uses backend /auth/forgot-password and /auth/reset-password.
 * Needs NEXT_PUBLIC_GOOGLE_CLIENT_ID and/or NEXT_PUBLIC_MICROSOFT_CLIENT_ID.
 */

import axios from "axios";
import { API_ROUTES } from "@/src/constants/api.constants";

export type SsoProvider = "google" | "microsoft";

/** signin: log in / sign up · company-setup: create a company workspace · connect: admin links SSO to current workspace */
export type SsoIntent = "signin" | "company-setup" | "connect";

const CLIENT_IDS: Record<SsoProvider, string | undefined> = {
  google: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  microsoft: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
};

/**
 * Sign-in buttons to show. Both are always shown; one whose client ID
 * isn't configured explains that when clicked.
 */
export const SSO_PROVIDERS: readonly SsoProvider[] = ["google", "microsoft"];

export const PROVIDER_LABEL: Record<SsoProvider, { personal: string; company: string }> = {
  google: { personal: "Google", company: "Google Workspace" },
  microsoft: { personal: "Microsoft", company: "Microsoft 365" },
};

const SSO_STATE_KEY = "sso_request";
const SSO_LAST_INTENT_KEY = "sso_last_intent";

/** Intent of the most recent SSO redirect (for "back" links after a failure). */
export function lastSsoIntent(): SsoIntent {
  try {
    return (sessionStorage.getItem(SSO_LAST_INTENT_KEY) as SsoIntent | null) ?? "signin";
  } catch {
    return "signin";
  }
}

type SsoRequest = {
  state: string;
  nonce: string;
  provider: SsoProvider;
  intent: SsoIntent;
  organizationName?: string;
};

const callbackUrl = () => `${window.location.origin}/auth/callback`;

function apiError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) return new Error(err.response?.data?.message ?? err.message);
  return err instanceof Error ? err : new Error(fallback);
}

// ── Google / Microsoft sign-in ─────────────────────────────────────────────

/**
 * Redirects the browser to Google or Microsoft. Resolves only if starting the redirect failed.
 *   loginHint   pre-fills the account (company SSO email)
 *   domainHint  Google: restrict the account picker to a Workspace domain
 */
export async function startSsoSignIn(
  provider: SsoProvider,
  options: { intent?: SsoIntent; organizationName?: string; loginHint?: string; domainHint?: string } = {},
): Promise<void> {
  const intent = options.intent ?? "signin";

  const clientId = CLIENT_IDS[provider];
  if (!clientId) {
    throw new Error(
      `${PROVIDER_LABEL[provider].personal} sign-in isn't set up yet. ` +
      `Add NEXT_PUBLIC_${provider.toUpperCase()}_CLIENT_ID (frontend) and ${provider.toUpperCase()}_CLIENT_ID (backend), then restart.`,
    );
  }

  const request: SsoRequest = {
    state: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    provider,
    intent,
    organizationName: options.organizationName,
  };
  sessionStorage.setItem(SSO_STATE_KEY, JSON.stringify(request));
  sessionStorage.setItem(SSO_LAST_INTENT_KEY, intent);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl(),
    response_type: "id_token",
    scope: "openid email profile",
    prompt: "select_account",
    nonce: request.nonce,
    state: request.state,
  });
  if (options.loginHint) params.set("login_hint", options.loginHint);

  if (provider === "google") {
    if (options.domainHint) params.set("hd", options.domainHint);
    window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  } else {
    params.set("response_mode", "fragment");
    // Company setup / connect only make sense for work accounts
    if (intent !== "signin") params.set("domain_hint", "organizations");
    window.location.assign(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`);
  }
}

/** Kept for existing callers: Google button. */
export const startGoogleSignIn = () => startSsoSignIn("google");

export type SsoCallbackResult =
  | { intent: "signin" | "company-setup"; data: unknown }
  | { intent: "connect"; data: unknown };

/**
 * On /auth/callback: validates the redirect (state + nonce) and finishes the request
 * with our backend. Sign-in/setup set auth cookies; connect links SSO to the
 * current workspace.
 */
export async function completeSsoCallback(): Promise<SsoCallbackResult> {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const raw = sessionStorage.getItem(SSO_STATE_KEY);
  sessionStorage.removeItem(SSO_STATE_KEY);
  window.history.replaceState(null, "", window.location.pathname);

  const oauthError = hash.get("error") ?? query.get("error");
  if (oauthError) {
    const description = hash.get("error_description") ?? query.get("error_description");
    throw new Error(oauthError === "access_denied"
      ? "Sign-in was cancelled."
      : `Sign-in failed: ${description ?? oauthError}`);
  }

  const request = raw ? (JSON.parse(raw) as SsoRequest) : null;
  const idToken = hash.get("id_token");
  if (!request || !idToken || hash.get("state") !== request.state) {
    throw new Error("Sign-in could not be verified. Please try again.");
  }

  const body = {
    provider: request.provider,
    id_token: idToken,
    nonce: request.nonce,
    intent: request.intent === "connect" ? undefined : request.intent,
    organization_name: request.organizationName,
  };

  try {
    if (request.intent === "connect") {
      const { data: apiRes } = await axios.post(API_ROUTES.SSO.CONNECT, body, { withCredentials: true });
      return { intent: "connect", data: apiRes.data };
    }
    const { data: apiRes } = await axios.post(API_ROUTES.SSO.CALLBACK, body, { withCredentials: true });
    return { intent: request.intent, data: apiRes.data };
  } catch (err) {
    throw apiError(err, "Sign-in failed");
  }
}

// ── Company SSO discovery ──────────────────────────────────────────────────

export type SsoDiscovery = { domain: string; providers: SsoProvider[]; organizationName: string | null };

export async function discoverCompanySso(email: string): Promise<SsoDiscovery> {
  try {
    const { data } = await axios.get(API_ROUTES.SSO.DISCOVER, { params: { email } });
    return data.data as SsoDiscovery;
  } catch (err) {
    throw apiError(err, "Could not look up company sign-in");
  }
}

// ── Password reset ─────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await axios.post(API_ROUTES.AUTH.FORGOT_PASSWORD, { email });
  } catch (err) {
    throw apiError(err, "Could not send the reset email");
  }
}

/** On /update-password: throws if the reset link is missing, invalid or expired. */
export async function checkPasswordResetLink(): Promise<void> {
  if (!new URLSearchParams(window.location.search).get("token")) {
    throw new Error("Invalid or expired reset link. Please request a new one.");
  }
}

export async function updatePasswordFromResetLink(password: string): Promise<void> {
  try {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    await axios.post(API_ROUTES.AUTH.RESET_PASSWORD, { token, password });
  } catch (err) {
    throw apiError(err, "Could not update the password");
  }
}

/** Where to send the user after a successful reset: they must log in with the new password. */
export const AFTER_PASSWORD_RESET_PATH = "/login";
