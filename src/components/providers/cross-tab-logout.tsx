"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAppDispatch } from "@/src/store/hooks"
import { resetAppStatus } from "@/src/store/appStatusSlice"
import {
  onCrossTabLogout,
  clearSession,
  clearProfile,
  clearSelectedClientId,
  clearSelectedClientProfile,
  clearBrowserDataOnLogout,
} from "@/src/store/localStorage"

/**
 * Listens for logout signals from other tabs.
 * When another tab logs out, this tab clears its own state and redirects to /login.
 * Place in the root layout so it runs on every page.
 */
export function CrossTabLogoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()

  useEffect(() => {
    const unsubscribe = onCrossTabLogout(async () => {
      // Don't act if already on the login page
      if (pathname === "/login" || pathname === "/signup") return

      // Clean up this tab's state
      clearSession()
      clearProfile()
      clearSelectedClientId()
      clearSelectedClientProfile()
      dispatch(resetAppStatus())
      await clearBrowserDataOnLogout()

      // Redirect to login
      router.push("/login")
    })

    return unsubscribe
  }, [router, pathname, dispatch])

  return <>{children}</>
}
