"use client"

import { useState, useMemo } from "react"
import { useSelector } from "react-redux"
import { ExternalLink, Search, Users, Check } from "lucide-react"
import type { RootState } from "@/src/store/store"
import type { AccessClient } from "@/src/store/accessSlice"

interface AccountSwitcherProps {
  onSwitchInTab: (client: AccessClient) => void
}

export function AccountSwitcher({ onSwitchInTab }: AccountSwitcherProps) {
  const [search, setSearch] = useState("")

  const { accessibleClients, selectedClientId, user } = useSelector(
    (s: RootState) => s.access
  )

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

  if (!accessibleClients.length) return null

  const handleOpenInNewTab = (client: AccessClient) => {
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

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Switch Account ({accessibleClients.length})
        </span>
      </div>

      {/* Search — only show if more than 5 clients */}
      {accessibleClients.length > 5 && (
        <div className="px-2 pb-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
      )}

      {/* Client list */}
      <div className="max-h-52 overflow-y-auto px-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No clients found</p>
        ) : (
          filtered.map((client) => {
            const isActive = client.id === selectedClientId
            const isSelf = client.id === user?.id
            return (
              <div
                key={client.id}
                className={`group relative mx-1 mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-muted"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {getInitials(client)}
                </div>

                {/* Info — click to switch in same tab */}
                <button
                  onClick={() => onSwitchInTab(client)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                  title={isSelf ? "Your own account" : `Switch to ${client.name || client.email}`}
                >
                  <p className="truncate text-xs font-medium">
                    {client.name || client.email}
                    {isSelf && (
                      <span className="ml-1 text-[10px] text-muted-foreground">(You)</span>
                    )}
                  </p>
                  {client.company_name && (
                    <p className="truncate text-[10px] text-muted-foreground">
                      {client.company_name}
                    </p>
                  )}
                </button>

                {/* Active check */}
                {isActive && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}

                {/* Open in new tab button */}
                {!isSelf && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenInNewTab(client)
                    }}
                    title="Open in new tab"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
