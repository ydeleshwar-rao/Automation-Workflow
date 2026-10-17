/**
 * Auth flows that don't go through our backend's email/password login:
 * Google / Microsoft sign-in, company SSO and password reset.
 *
 * Sign-in uses the OpenID Connect ID-token flow verified by our backend (/sso/*);
 * password reset uses backend /auth/forgot-password and /auth/reset-password.
 * Needs NEXT_PUBLIC_GOOGLE_CLIENT_ID and/or NEXT_PUBLIC_MICROSOFT_CLIENT_ID.
 */

import { store } from "@/src/store/store";
import { authApi, type AuthSessionResponse, type SsoTokenRequest } from "@/src/components/auth/apiIntegrations/authApi";
import { getApiErrorMessage } from "@/src/lib/api-error";

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
const SSO_FAILED_MESSAGE = "Sign-in failed";

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

/** Callers show `error.message`, so backend failures are rethrown as plain Errors. */
async function requestOrThrow<Result>(request: Promise<Result>, fallbackMessage: string): Promise<Result> {
  try {
    return await request;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallbackMessage));
  }
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
  | { intent: "signin" | "company-setup"; data: AuthSessionResponse }
  | { intent: "connect"; data: unknown };

/**
 * On /auth/callback: validates the redirect (state + nonce) and finishes the request
 * with our backend. Sign-in/setup set auth cookies; connect links SSO to the
 * current workspace.
 */
export async function completeSsoCallback(): Promise<SsoCallbackResult> {
  const request = readSsoRedirect();
  const body: SsoTokenRequest = {
    provider: request.provider,
    id_token: request.idToken,
    nonce: request.nonce,
    intent: request.intent === "connect" ? undefined : request.intent,
    organization_name: request.organizationName,
  };

  if (request.intent === "connect") {
    const response = await requestOrThrow(
      store.dispatch(authApi.endpoints.connectSso.initiate(body)).unwrap(),
      SSO_FAILED_MESSAGE,
    );
    return { intent: "connect", data: response.data };
  }
  const response = await requestOrThrow(
    store.dispatch(authApi.endpoints.ssoSignIn.initiate(body)).unwrap(),
    SSO_FAILED_MESSAGE,
  );
  return { intent: request.intent, data: response.data };
}

/** Reads the provider's redirect, clears it from the URL and checks it answers the request we started. */
function readSsoRedirect(): SsoRequest & { idToken: string } {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const storedRequest = sessionStorage.getItem(SSO_STATE_KEY);
  sessionStorage.removeItem(SSO_STATE_KEY);
  window.history.replaceState(null, "", window.location.pathname);

  const oauthError = hash.get("error") ?? query.get("error");
  if (oauthError) {
    const description = hash.get("error_description") ?? query.get("error_description");
    throw new Error(oauthError === "access_denied"
      ? "Sign-in was cancelled."
      : `Sign-in failed: ${description ?? oauthError}`);
  }

  const request = storedRequest ? (JSON.parse(storedRequest) as SsoRequest) : null;
  const idToken = hash.get("id_token");
  if (!request || !idToken || hash.get("state") !== request.state) {
    throw new Error("Sign-in could not be verified. Please try again.");
  }
  return { ...request, idToken };
}

// ── Company SSO discovery ──────────────────────────────────────────────────

export type SsoDiscovery = { domain: string; providers: SsoProvider[]; organizationName: string | null };

export async function discoverCompanySso(email: string): Promise<SsoDiscovery> {
  const response = await requestOrThrow(
    store.dispatch(authApi.endpoints.discoverCompanySso.initiate(email, { subscribe: false, forceRefetch: true })).unwrap(),
    "Could not look up company sign-in",
  );
  return response.data;
}

// ── Password reset ─────────────────────────────────────────────────────────

const RESET_TOKEN_PARAM = "token";

export async function requestPasswordReset(email: string): Promise<void> {
  await requestOrThrow(
    store.dispatch(authApi.endpoints.requestPasswordReset.initiate(email)).unwrap(),
    "Could not send the reset email",
  );
}

/** On /update-password: throws if the reset link is missing, invalid or expired. */
export async function checkPasswordResetLink(): Promise<void> {
  if (!new URLSearchParams(window.location.search).get(RESET_TOKEN_PARAM)) {
    throw new Error("Invalid or expired reset link. Please request a new one.");
  }
}

export async function updatePasswordFromResetLink(password: string): Promise<void> {
  const token = new URLSearchParams(window.location.search).get(RESET_TOKEN_PARAM) ?? "";
  await requestOrThrow(
    store.dispatch(authApi.endpoints.resetPassword.initiate({ token, password })).unwrap(),
    "Could not update the password",
  );
}

/** Where to send the user after a successful reset: they must log in with the new password. */
export const AFTER_PASSWORD_RESET_PATH = "/login";
