"use client";

/**
 * useUser hook
 * ─────────────────────────────────────────────────────────────
 * Provides the logged-in user's display profile and logout logic.
 *
 * Architecture changes:
 *   - Removed selectedClientProfile (no client-switching)
 *   - Removed isActingAsClient / loggedInAs (no impersonation)
 *   - Profile is always the logged-in user's own data
 *   - Reads from localStorage StoredProfile + Redux access slice
 */

import { useState, useEffect, useMemo } from "react";
import { useRouter }                    from "next/navigation";
import { useSelector }                  from "react-redux";
import type { RootState }               from "@/src/store/store";
import { useAppDispatch }               from "@/src/store/hooks";
import { resetAppStatus }               from "@/src/store/appStatusSlice";
import { clearAccess }                  from "@/src/store/accessSlice";
import {
  loadProfile,
  clearProfile,
  clearSession,
  clearBrowserDataOnLogout,
  broadcastLogout,
} from "@/src/store/localStorage";

export interface UserProfile {
  id?:        string;
  email?:     string | null;
  full_name?: string | null;
  role?:      string | null;
}

export function useUser() {
  const [storedProfile, setStoredProfile] = useState<
    UserProfile | null | undefined
  >(undefined); // undefined = still loading

  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useSelector((s: RootState) => s.access);

  useEffect(() => {
    const stored = loadProfile();
    if (stored) {
      setStoredProfile({
        id:        stored.userId,
        email:     stored.email    ?? null,
        full_name: stored.fullName ?? null,
        role:      stored.role     ?? null,
      });
    } else {
      setStoredProfile(null);
    }
  }, []);

  /** The profile to display — prefers Redux user (always up-to-date after login). */
  const profile = useMemo<UserProfile | null | undefined>(() => {
    if (storedProfile === undefined) return undefined;
    if (!user && storedProfile === null) return null;

    // Merge: Redux user has the authoritative role + id, profile has display name
    return {
      id:        user?.id        ?? storedProfile?.id,
      email:     user?.email     ?? storedProfile?.email,
      full_name: storedProfile?.full_name ?? null,
      role:      user?.role      ?? storedProfile?.role,
    };
  }, [storedProfile, user]);

  /** Avatar initials derived from full_name → email fallback. */
  const initials = useMemo(() => {
    if (!profile) return "?";
    const name = profile.full_name?.trim();
    if (name) {
      const parts = name.split(" ");
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "?";
    }
    return (profile.email?.[0] ?? "?").toUpperCase();
  }, [profile]);

  const logout = async () => {
    // Signal all other open tabs to log out too
    broadcastLogout();

    clearSession();
    clearProfile();
    dispatch(resetAppStatus());
    dispatch(clearAccess());
    await clearBrowserDataOnLogout();
    router.push("/login");
  };

  const navigateToAdmin   = () => router.push("/admin");
  const navigateToProfile = () => router.push("/dashboard/profile");

  return {
    profile,          // undefined = loading | null = not logged in | object = ready
    loggedInAs: null, // deprecated — kept for prop-type compatibility; always null now
    initials,
    logout,
    navigateToAdmin,
    navigateToProfile,
  };
}
