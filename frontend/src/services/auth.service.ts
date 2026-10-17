/**
 * Frontend session persistence after a successful sign-in.
 *
 * Tokens live in HttpOnly cookies set by the backend; only the user's
 * identity, role and permissions are kept in localStorage for the UI.
 */

import { saveSession, saveProfile } from "@/src/store/localStorage";
import type { AuthSessionResponse } from "@/src/components/auth/apiIntegrations/authApi";

/** Used when the backend omits expires_in. */
const DEFAULT_SESSION_MAX_AGE_SECONDS = 86400;

/**
 * Save a successful sign-in response (login, setup or SSO) to localStorage.
 */
export function persistLoginResponse(session: AuthSessionResponse): void {
  const { user, expires_in: expiresIn } = session;
  const maxAge = typeof expiresIn === "number" ? expiresIn : DEFAULT_SESSION_MAX_AGE_SECONDS;
  const organizationId = user.organization_id ?? user.organizationId;

  saveSession({
    userId:       user.id,
    email:        user.email,
    role:         user.role,
    organizationId,
    permissions:  user.permissions,
    expiresIn:    maxAge,
  });

  saveProfile({
    userId:    user.id,
    email:     user.email,
    role:      user.role,
    organizationId,
    fullName:  user.full_name,
    avatarUrl: user.avatar_url,
  });
}
