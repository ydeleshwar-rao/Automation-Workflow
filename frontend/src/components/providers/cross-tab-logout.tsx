"use client";

/**
 * CrossTabLogoutProvider
 * ─────────────────────────────────────────────────────────────
 * Listens for logout signals from other browser tabs.
 * When any tab logs out, all other tabs clear state and redirect to /login.
 *
 * Architecture changes:
 *   - Removed clearSelectedClientId / clearSelectedClientProfile (concept removed)
 *   - Also dispatches clearAccess() to reset the Redux access slice
 */

import { useEffect }        from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppDispatch }   from "@/src/store/hooks";
import { resetAppStatus }   from "@/src/store/appStatusSlice";
import { clearAccess }      from "@/src/store/accessSlice";
import {
  onCrossTabLogout,
  clearSession,
  clearProfile,
  clearBrowserDataOnLogout,
} from "@/src/store/localStorage";

export function CrossTabLogoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = onCrossTabLogout(async () => {
      // Already on login page — do nothing
      if (pathname === "/login" || pathname === "/signup") return;

      clearSession();
      clearProfile();
      dispatch(resetAppStatus());
      dispatch(clearAccess());
      await clearBrowserDataOnLogout();

      router.push("/login");
    });

    return unsubscribe;
  }, [router, pathname, dispatch]);

  return <>{children}</>;
}
