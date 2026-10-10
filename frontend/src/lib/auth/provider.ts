/**
 * Auth provider switch for the flows that don't go through our backend's
 * email/password login: Google sign-in and password reset.
 *
 * NEXT_PUBLIC_AUTH_PROVIDER (must match the backend's DB_PROVIDER):
 *   postgres (default)  Google ID token flow + backend /auth/forgot-password & /auth/reset-password.
 *                       Needs NEXT_PUBLIC_GOOGLE_CLIENT_ID for Google sign-in.
 *   supabase            Supabase Auth (needs NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY).
 */

import axios from "axios";
import { API_ROUTES } from "@/src/constants/api.constants";
import { createClient } from "@/src/lib/supabase/client";

export type AuthProvider = "postgres" | "supabase";

export const AUTH_PROVIDER: AuthProvider =
  process.env.NEXT_PUBLIC_AUTH_PROVIDER === "supabase" ? "supabase" : "postgres";

const GOOGLE_NONCE_KEY = "google_oauth_nonce";

const callbackUrl = () => `${window.location.origin}/auth/callback`;

function apiError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) return new Error(err.response?.data?.message ?? err.message);
  return err instanceof Error ? err : new Error(fallback);
}

// ── Google sign-in ─────────────────────────────────────────────────────────

/** Redirects the browser to Google. Resolves only if starting the redirect failed. */
export async function startGoogleSignIn(): Promise<void> {
  if (AUTH_PROVIDER === "supabase") {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl(),
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    if (error) throw error;
    return;
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Google sign-in is not configured (NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing)");

  const nonce = crypto.randomUUID();
  sessionStorage.setItem(GOOGLE_NONCE_KEY, nonce);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl(),
    response_type: "id_token",
    scope: "openid email profile",
    prompt: "select_account",
    nonce,
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

/**
 * On /auth/callback: returns the token our backend's POST /auth/google expects
 * (Supabase access token, or Google ID token for the postgres provider).
 */
export async function getGoogleCallbackToken(): Promise<string> {
  if (AUTH_PROVIDER === "supabase") {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      throw new Error(error?.message ?? "Google sign-in session was not found");
    }
    return data.session.access_token;
  }

  const hash = new URLSearchParams(window.location.hash.slice(1));
  const oauthError = hash.get("error") ?? new URLSearchParams(window.location.search).get("error");
  if (oauthError) throw new Error(`Google sign-in was cancelled or failed (${oauthError})`);

  const idToken = hash.get("id_token");
  if (!idToken) throw new Error("Google sign-in token was not found");

  const expectedNonce = sessionStorage.getItem(GOOGLE_NONCE_KEY);
  sessionStorage.removeItem(GOOGLE_NONCE_KEY);
  const payload = JSON.parse(atob(idToken.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
  if (!expectedNonce || payload.nonce !== expectedNonce) {
    throw new Error("Google sign-in could not be verified. Please try again.");
  }

  window.history.replaceState(null, "", window.location.pathname);
  return idToken;
}

/** Ends the provider-side session after our backend has issued its own cookies. */
export async function finishGoogleSignIn(): Promise<void> {
  if (AUTH_PROVIDER === "supabase") await createClient().auth.signOut();
}

// ── Password reset ─────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  if (AUTH_PROVIDER === "supabase") {
    // The redirect URL must be allowed in Supabase → Authentication → URL Configuration
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) throw error;
    return;
  }

  try {
    await axios.post(API_ROUTES.AUTH.FORGOT_PASSWORD, { email });
  } catch (err) {
    throw apiError(err, "Could not send the reset email");
  }
}

/** On /update-password: throws if the reset link is missing, invalid or expired. */
export async function checkPasswordResetLink(): Promise<void> {
  if (AUTH_PROVIDER === "supabase") {
    const { data, error } = await createClient().auth.getSession();
    if (!data.session) throw new Error(error?.message ?? "Invalid or expired reset link. Please request a new one.");
    return;
  }

  if (!new URLSearchParams(window.location.search).get("token")) {
    throw new Error("Invalid or expired reset link. Please request a new one.");
  }
}

export async function updatePasswordFromResetLink(password: string): Promise<void> {
  if (AUTH_PROVIDER === "supabase") {
    const { error } = await createClient().auth.updateUser({ password });
    if (error) throw error;
    return;
  }

  try {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    await axios.post(API_ROUTES.AUTH.RESET_PASSWORD, { token, password });
  } catch (err) {
    throw apiError(err, "Could not update the password");
  }
}

/** Where to send the user after a successful reset (postgres: must log in with the new password). */
export const AFTER_PASSWORD_RESET_PATH = AUTH_PROVIDER === "supabase" ? "/dashboard" : "/login";
