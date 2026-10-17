import { useMemo } from "react";
import { getActiveUserId, loadProfile } from "@/src/store/localStorage";

const ADMIN_ROLE = "admin";

export interface OwnerQueryArgs {
  userId: string;
  role?: string;
}

/** Who is signed in, and the owner arguments the workflow/tag list endpoints expect (admins see everything). */
export function useCurrentUserScope() {
  return useMemo(() => {
    const userId = getActiveUserId();
    const isAdmin = (loadProfile()?.role ?? "").toLowerCase() === ADMIN_ROLE;
    const ownerQueryArgs: OwnerQueryArgs = { userId, ...(isAdmin ? { role: ADMIN_ROLE } : {}) };
    return { userId, isAdmin, ownerQueryArgs };
  }, []);
}
