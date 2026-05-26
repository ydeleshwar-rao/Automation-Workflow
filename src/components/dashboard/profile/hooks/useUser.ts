"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store/store";
import { useAppDispatch } from "@/src/store/hooks";
import { resetAppStatus } from "@/src/store/appStatusSlice";
import {
  loadProfile,
  clearProfile,
  clearSession,
  clearBrowserDataOnLogout,
  clearSelectedClientId,
  clearSelectedClientProfile,
  broadcastLogout,
} from "@/src/store/localStorage";

export interface UserProfile {
  id?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  company_name?: string | null;
  phone?: string | null;
  website_url?: string | null;
  clientkey?: string | null;
}

export function useUser() {
  const [storedProfile, setStoredProfile] = useState<UserProfile | null | undefined>(undefined);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { selectedClientProfile, user } = useSelector((s: RootState) => s.access);

  useEffect(() => {
    const stored = loadProfile();
    if (stored) {
      setStoredProfile({
        id: stored.userId,
        email: stored.email ?? null,
        first_name: stored.firstName ?? null,
        last_name: stored.lastName ?? null,
        role: stored.role ?? null,
        company_name: stored.companyName ?? null,
        phone: stored.phone ?? null,
        website_url: stored.websiteUrl ?? null,
        clientkey: stored.clientKey ?? null,
      });
    } else {
      setStoredProfile(null);
    }
  }, []);

  // For developers AND admins: when a client/user is selected, the display
  // profile is the SELECTED user, not the operator. Both roles are management
  // tiers — the UI should reflect whose data they are working on.
  const isActingAsClient =
    (user?.role === "developer" || user?.role === "admin") &&
    selectedClientProfile &&
    selectedClientProfile.id !== user.id;

  // The profile shown in the UI (avatar, profile section, profile page)
  const profile = useMemo<UserProfile | null | undefined>(() => {
    if (storedProfile === undefined) return undefined; // still loading
    if (storedProfile === null) return null; // not logged in

    if (isActingAsClient && selectedClientProfile) {
      // Split the client name into first/last for consistent display
      const nameParts = (selectedClientProfile.name || "").split(" ");
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(" ") || null;

      return {
        id: selectedClientProfile.id,
        email: selectedClientProfile.email ?? null,
        first_name: firstName,
        last_name: lastName,
        role: "user", // clients are "user" role
        company_name: selectedClientProfile.companyName ?? null,
        phone: null,
        website_url: null,
        clientkey: null,
      };
    }

    return storedProfile;
  }, [storedProfile, isActingAsClient, selectedClientProfile]);

  // The operator's own identity — shown as a small label "Logged in as: ..."
  // Populated whenever a developer OR admin is acting on behalf of a client.
  const loggedInAs = useMemo(() => {
    if (!storedProfile || !isActingAsClient) return null;
    return {
      name: [storedProfile.first_name, storedProfile.last_name]
        .filter(Boolean)
        .join(" ") || storedProfile.email || (storedProfile.role === "admin" ? "Admin" : "Developer"),
      role: storedProfile.role,
    };
  }, [storedProfile, isActingAsClient]);

  const initials = profile
    ? (
        (profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")
      ).toUpperCase() ||
      profile.email?.[0]?.toUpperCase() ||
      "U"
    : "?";

  const logout = async () => {
    // Signal all other tabs to log out BEFORE we clear data
    broadcastLogout();

    clearSession();
    clearProfile();
    clearSelectedClientId();
    clearSelectedClientProfile();
    dispatch(resetAppStatus());
    await clearBrowserDataOnLogout();
    router.push("/login");
  };

  const navigateToAdmin = () => router.push("/admin");
  const navigateToProfile = () => router.push("/dashboard/profile");

  return {
    profile,          // undefined = loading, null = not logged in, object = loaded
                      // For developers with a selected client, this IS the client's profile
    loggedInAs,       // null unless developer is acting as a client; shows developer's own name
    initials,         // Reflects the display profile (client when acting-as)
    logout,
    navigateToAdmin,
    navigateToProfile,
  };
}
