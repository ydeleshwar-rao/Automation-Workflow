"use client"

import { useEffect, useLayoutEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useDispatch } from "react-redux"
import type { AppDispatch } from "@/src/store/store"
import { bootstrapAccess } from "@/src/store/accessSlice"
import { fetchAppStatus } from "@/src/store/appStatusSlice"
import {
  loadSession,
  saveSelectedClientId,
  clearSelectedClientProfile,
  clearWorkflowState,
} from "@/src/store/localStorage"

export default function SwitchAccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useDispatch<AppDispatch>()
  const didRun = useRef(false)

  const clientId = searchParams.get("clientId")

  // Set sessionStorage BEFORE any other effects (like AccessBootstrap) run.
  // useLayoutEffect fires synchronously before paint, guaranteeing that
  // AccessBootstrap's useEffect will see the correct clientId in sessionStorage.
  useLayoutEffect(() => {
    if (!clientId) return
    clearSelectedClientProfile()
    clearWorkflowState()
    saveSelectedClientId(clientId)
  }, [clientId])

  // Then dispatch bootstrap to populate Redux with the correct client
  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    if (!clientId) {
      router.replace("/dashboard")
      return
    }

    const session = loadSession()
    if (!session) {
      router.replace("/login")
      return
    }

    dispatch(bootstrapAccess())
      .then(() => dispatch(fetchAppStatus()))
      .then(() => {
        router.replace("/dashboard")
      })
  }, [clientId, router, dispatch])

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Switching account...</p>
      </div>
    </div>
  )
}
