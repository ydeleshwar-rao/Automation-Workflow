"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import type { RootState } from "@/src/store/store"

/**
 * Client-side gate for /admin/* routes.
 * Reads role from the Redux access slice (already populated by AccessBootstrap)
 * instead of doing a server-side Supabase call, which previously caused
 * blank _rsc=xxx responses on soft-navigation because redirect() ran inside
 * an async Suspense layout.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, status } = useSelector((s: RootState) => s.access)

  useEffect(() => {
    if (status !== "ready") return
    if (!user) {
      router.replace("/login")
      return
    }
    if (user.role !== "admin") {
      router.replace("/dashboard")
    }
  }, [status, user, router])

  if (status === "idle" || status === "loading") {
    return (
      <div className="p-6 space-y-8 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user || user.role !== "admin") return null

  return <>{children}</>
}
