/**
 * Frontend auth service — custom JWT based.
 *
 * All auth goes through the backend API.
 * No direct Supabase connection from the frontend.
 * Permissions are read from the stored JWT session.
 */

import {
  loadSession,
  saveSession,
  saveProfile,
  clearSession,
  clearProfile,
  clearBrowserDataOnLogout,
  type StoredSession,
} from "@/src/store/localStorage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "developer";

export interface AuthUser {
  id:          string;
  email:       string;
  role:        UserRole;
  permissions: string[];   // page keys or ['*'] for admin
  fullName?:   string;
  avatarUrl?:  string | null;
}

// ─── Role helpers ─────────────────────────────────────────────────────────────

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

export function isDeveloperRole(role: string | null | undefined): boolean {
  return role === "developer";
}

/**
 * Check if the current user has view access to a page.
 * Admin always has access. Developer only has access to their permitted pages.
 */
export function hasPageAccess(permissions: string[], pageKey: string): boolean {
  return permissions.includes("*") || permissions.includes(pageKey);
}

// ─── Session helpers ──────────────────────────────────────────────────────────

/**
 * Get the current authenticated user from the stored session.
 * Returns null if not logged in or session is missing.
 * Does NOT make an API call — reads from localStorage.
 */
export function getCurrentUser(): AuthUser | null {
  const session = loadSession();
  if (!session?.userId) return null;
  return {
    id:          session.userId,
    email:       session.email,
    role:        session.role as UserRole,
    permissions: session.permissions,
  };
}

/**
 * Get the stored access token.
 * Returns null if not logged in.
 */
export function getAccessToken(): string | null {
  return loadSession()?.accessToken ?? null;
}

/**
 * Check if user is currently logged in (has a stored session).
 */
export function isLoggedIn(): boolean {
  const session = loadSession();
  return !!session?.accessToken;
}

// ─── Login / Logout ───────────────────────────────────────────────────────────

/**
 * Save a successful login response to localStorage.
 * Called after POST /auth/login succeeds.
 */
export function persistLoginResponse(data: {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;
  user: {
    id:          string;
    email:       string;
    role:        string;
    permissions: string[];
    full_name?:  string;
    avatar_url?: string | null;
  };
}): void {
  const { user, access_token, refresh_token, expires_in } = data;

  saveSession({
    userId:       user.id,
    email:        user.email,
    role:         user.role,
    permissions:  user.permissions,
    accessToken:  access_token,
    refreshToken: refresh_token,
    expiresIn:    expires_in,
  });

  saveProfile({
    userId:    user.id,
    email:     user.email,
    role:      user.role,
    fullName:  user.full_name,
    avatarUrl: user.avatar_url,
  });
}

/**
 * Clear all auth data and browser state on logout.
 */
export async function logout(): Promise<void> {
  clearSession();
  clearProfile();
  await clearBrowserDataOnLogout();
}
