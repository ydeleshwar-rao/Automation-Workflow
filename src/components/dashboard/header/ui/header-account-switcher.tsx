"use client"

import { useState, useMemo } from "react"
import { useSelector } from "react-redux"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
  ChevronDown,
  ExternalLink,
  Search,
  Check,
  Users,
} from "lucide-react"
import type { RootState } from "@/src/store/store"
import type { AccessClient } from "@/src/store/accessSlice"

export function HeaderAccountSwitcher() {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  const { accessibleClients, selectedClientId, selectedClientProfile, user } =
    useSelector((s: RootState) => s.access)

  const showSwitcher =
    accessibleClients.length > 0 &&
    (user?.role === "admin" || user?.role === "developer")

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

  const handleOpenInNewTab = (client: AccessClient) => {
    const url = `${window.location.origin}/dashboard/switch-account?clientId=${client.id}`
    window.open(url, "_blank", "noopener")
    setOpen(false)
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

  if (!showSwitcher) return null

  const currentLabel =
    selectedClientProfile?.name ||
    selectedClientProfile?.email ||
    "Select Client"

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 text-xs font-medium text-foreground transition-all hover:bg-secondary hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[160px] truncate">{currentLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-80 border-border bg-popover p-0 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-xs font-semibold text-foreground">
            Switch Account
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {accessibleClients.length} client{accessibleClients.length !== 1 ? "s" : ""}
          </span>
        </div>

        <DropdownMenuSeparator className="my-0" />

        {/* Search */}
        {accessibleClients.length > 5 && (
          <div className="px-2 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Hint */}
        <p className="px-3 pb-1 text-[10px] text-muted-foreground">
          Each client opens in a new tab
        </p>

        {/* Client list */}
        <div className="max-h-64 overflow-y-auto px-1.5 py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">
              No clients found
            </p>
          ) : (
            filtered.map((client) => {
              const isActive = client.id === selectedClientId
              return (
                <button
                  key={client.id}
                  onClick={() => handleOpenInNewTab(client)}
                  className={`group relative mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    isActive
                      ? "bg-primary/10"
                      : "hover:bg-muted"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {getInitials(client)}
                  </div>

                  {/* Client info */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-xs font-medium ${
                        isActive ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {client.name || client.email}
                      {isActive && (
                        <span className="ml-1 text-[10px] text-primary/70">(current)</span>
                      )}
                    </p>
                    {client.company_name && (
                      <p className="truncate text-[10px] text-muted-foreground">
                        {client.company_name}
                      </p>
                    )}
                    {!client.company_name && client.name && (
                      <p className="truncate text-[10px] text-muted-foreground">
                        {client.email}
                      </p>
                    )}
                  </div>

                  {/* Active check */}
                  {isActive && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}

                  {/* New tab icon */}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
