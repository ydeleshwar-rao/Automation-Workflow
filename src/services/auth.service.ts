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
} from "@/src/store/localStorage";
import axios from "axios";
import { API_ROUTES } from "@/src/constants/api.constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "developer";

export interface AuthUser {
  id:          string;
  email:       string;
  role:        UserRole;
  permissions: string[];   // page keys or ['*'] for admin
  organizationId?: string;
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
    organizationId: session.organizationId,
  };
}

/**
 * Get the stored access token.
 * Returns null if not logged in.
 */
export function getAccessToken(): string | null {
  return null;
}

/**
 * Check if user is currently logged in (has a stored session).
 */
export function isLoggedIn(): boolean {
  const session = loadSession();
  return !!session?.userId;
}

// ─── Login / Logout ───────────────────────────────────────────────────────────

/**
 * Save a successful login response to localStorage.
 * Called after POST /auth/login succeeds.
 */
export function persistLoginResponse(data: {
  access_token?:  string;
  refresh_token?: string;
  expires_in:    number;
  user: {
    id:          string;
    email:       string;
    role:        string;
    permissions: string[];
    organization_id?: string;
    organizationId?:  string;
    full_name?:  string;
    avatar_url?: string | null;
  };
}): void {
  const { user, expires_in } = data;
  const maxAge = typeof expires_in === "number" ? expires_in : 86400;

  saveSession({
    userId:       user.id,
    email:        user.email,
    role:         user.role,
    organizationId: user.organization_id ?? user.organizationId,
    permissions:  user.permissions,
    expiresIn:    maxAge,
  });

  saveProfile({
    userId:    user.id,
    email:     user.email,
    role:      user.role,
    organizationId: user.organization_id ?? user.organizationId,
    fullName:  user.full_name,
    avatarUrl: user.avatar_url,
  });
}

/**
 * Clear all auth data and browser state on logout.
 */
export async function logout(): Promise<void> {
  try {
    await axios.post(API_ROUTES.AUTH.LOGOUT, {}, { withCredentials: true });
  } catch {
    // Local cleanup should still happen if the network request fails.
  }
  clearSession();
  clearProfile();
  await clearBrowserDataOnLogout();
}
