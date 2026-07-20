"use client"

import { useEffect, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { usePathname } from "next/navigation"
import type { AppDispatch, RootState } from "@/src/store/store"
import { bootstrapAccess } from "@/src/store/accessSlice"
import { loadSession } from "@/src/store/localStorage"

/**
 * Bootstraps the access state (user, accessible clients, permissions)
 * on dashboard mount. Skips if already loaded, already loading,
 * or no session exists.
 *
 * The switch-account page handles its own bootstrap, so this skips
 * when on that route to avoid race conditions.
 */
export function AccessBootstrap() {
  const dispatch = useDispatch<AppDispatch>()
  const status = useSelector((s: RootState) => s.access.status)
  const pathname = usePathname()
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return

    // The switch-account page dispatches its own bootstrap
    if (pathname === "/dashboard/switch-account") return

    if (status === "idle" || status === "error") {
      const session = loadSession()
      if (session?.userId) {
        didRun.current = true
        dispatch(bootstrapAccess())
      }
    }
  }, [dispatch, status, pathname])

  return null
}
