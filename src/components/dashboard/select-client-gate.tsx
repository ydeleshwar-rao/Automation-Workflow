"use client"

import { useState, useMemo, useRef } from "react"
import { useSelector, useDispatch } from "react-redux"
import { usePathname } from "next/navigation"
import { Users, Search, ExternalLink, Building2 } from "lucide-react"
import type { RootState, AppDispatch } from "@/src/store/store"
import {
  setSelectedClient,
  bootstrapAccess,
  type AccessClient,
} from "@/src/store/accessSlice"
import {
  clearSelectedClientProfile,
  clearWorkflowState,
} from "@/src/store/localStorage"

/**
 * Full-page gate shown to developers/admins when no client is selected.
 * Renders the client list so the user must pick one before seeing the dashboard.
 * Returns null if a client is already selected or if the user is a regular client.
 */
export function SelectClientGate({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()
  const pathname = usePathname()
  const { user, accessibleClients, selectedClientId, status } = useSelector(
    (s: RootState) => s.access
  )
  const [search, setSearch] = useState("")

  // Once access has been ready at least once, never unmount children for a
  // transient re-bootstrap. Without this, a background refetch that flips status
  // back to "loading" replaces the destination page with a spinner, so menu
  // clicks appear to "not route".
  const hasBeenReadyRef = useRef(false)
  if (status === "ready") hasBeenReadyRef.current = true

  // Never gate the switch-account page — it handles its own client setup
  const isSwitchAccountPage = pathname === "/dashboard/switch-account"

  // Only gate developers and admins
  const shouldGate =
    !isSwitchAccountPage &&
    status === "ready" &&
    (user?.role === "developer" || user?.role === "admin") &&
    !selectedClientId &&
    accessibleClients.length > 0

  const filtered = useMemo(() => {
    if (!search.trim()) return accessibleClients
    const q = search.toLowerCase()
    return accessibleClients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company_name?.toLowerCase().includes(q)
    )
  }, [search, accessibleClients])

  const handleSelectAndOpen = (client: AccessClient) => {
    // Set in current tab so the header shows the selected client
    clearSelectedClientProfile()
    clearWorkflowState()

    dispatch(
      setSelectedClient({
        id: client.id,
        profile: {
          id: client.id,
          email: client.email,
          name: client.name,
          companyName: client.company_name,
          clientKey: client.clientkey,
        },
      })
    )
    dispatch(bootstrapAccess())

    // Also open in a new tab
    const url = `${window.location.origin}/dashboard/switch-account?clientId=${client.id}`
    window.open(url, "_blank", "noopener")
  }

  const getInitials = (client: AccessClient) => {
    if (client.name) {
      return client.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return client.email?.[0]?.toUpperCase() || "?"
  }

  // While access state is bootstrapping for the FIRST time, show a spinner
  // instead of children. Once access has been ready at least once, skip this
  // block — a transient re-bootstrap must not unmount the destination page
  // (that's what made sidebar clicks look like they weren't routing). The
  // switch-account page is exempt because it drives its own client selection.
  if (
    !isSwitchAccountPage &&
    !hasBeenReadyRef.current &&
    (status === "idle" || status === "loading")
  ) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading workspace…</p>
        </div>
      </div>
    )
  }

  if (!shouldGate) return <>{children}</>

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Icon + heading */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Select a Client Account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a client to manage. Each client opens in its own tab so you
            can work on multiple accounts simultaneously.
          </p>
        </div>

        {/* Card with search + list */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          {/* Search */}
          {accessibleClients.length > 5 && (
            <div className="border-b border-border px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          {/* Client list */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No clients found
              </p>
            ) : (
              filtered.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSelectAndOpen(client)}
                  className="group mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {getInitials(client)}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {client.name || client.email}
                    </p>
                    <div className="flex items-center gap-2">
                      {client.company_name && (
                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {client.company_name}
                        </span>
                      )}
                      {client.company_name && client.email && (
                        <span className="text-xs text-border">|</span>
                      )}
                      <span className="truncate text-xs text-muted-foreground">
                        {client.email}
                      </span>
                    </div>
                  </div>

                  {/* Open in new tab indicator */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all group-hover:bg-primary/10 group-hover:text-primary group-hover:opacity-100">
                    <ExternalLink className="h-4 w-4" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Hint */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {accessibleClients.length} client{accessibleClients.length !== 1 ? "s" : ""} assigned to you.
          You can switch anytime from the header.
        </p>
      </div>
    </div>
  )
}
