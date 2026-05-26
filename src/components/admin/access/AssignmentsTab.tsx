"use client"

import { useMemo, useState } from "react"
import { Plus, Search, Shield, UserMinus, Users as UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import {
  useGetAccessUsersQuery,
  useGetAssignmentsQuery,
  useRevokeAssignmentMutation,
  type AccessUserRecord,
  type AssignmentRecord,
} from "@/src/components/admin/access/apiIntegrations/accessApi"
import { AssignClientsModal } from "./AssignClientsModal"
import { DeveloperPermissionsModal } from "./DeveloperPermissionsModal"

// ── Helpers ─────────────────────────────────────────────────────────────────

function fullName(u: { first_name?: string | null; last_name?: string | null; email: string }): string {
  const full = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim()
  return full || u.email
}

function initials(u: { first_name?: string | null; last_name?: string | null; email: string }): string {
  const f = (u.first_name ?? "").trim()
  const l = (u.last_name ?? "").trim()
  const fromName = `${f[0] ?? ""}${l[0] ?? ""}`.toUpperCase()
  if (fromName) return fromName
  return (u.email[0] ?? "?").toUpperCase()
}

// ── Client card (assigned client tile) ──────────────────────────────────────

function ClientRow({
  client,
  developer,
  onRemove,
  removing,
}: {
  client: AccessUserRecord
  developer: AccessUserRecord
  onRemove: () => void
  removing: boolean
}) {
  const [showPerms, setShowPerms] = useState(false)

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
          {initials(client)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate" title={fullName(client)}>
            {fullName(client)}
          </div>
          <div className="text-xs text-muted-foreground truncate" title={client.email}>
            {client.email}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowPerms(true)}
          className="shrink-0"
        >
          <Shield className="h-4 w-4" />
          Permissions
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRemove}
          disabled={removing}
          className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <UserMinus className="h-4 w-4" />
          Unassign
        </Button>
      </div>

      <DeveloperPermissionsModal
        developer={developer}
        client={client}
        isOpen={showPerms}
        onClose={() => setShowPerms(false)}
      />
    </>
  )
}

// ── Developer card (one per developer) ──────────────────────────────────────

function DeveloperCard({
  developer,
  onAssign,
}: {
  developer: AccessUserRecord
  onAssign: (dev: AccessUserRecord, assignments: AssignmentRecord[]) => void
}) {
  const { data: assignmentsResp, isLoading } = useGetAssignmentsQuery({
    developer_id: developer.id,
  })
  const [revoke, { isLoading: isRevoking }] = useRevokeAssignmentMutation()
  const assignments = assignmentsResp?.data ?? []

  const [clientSearch, setClientSearch] = useState("")
  const filteredAssignments = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return assignments
    return assignments.filter((a) =>
      `${fullName(a.client)} ${a.client.email}`.toLowerCase().includes(q),
    )
  }, [assignments, clientSearch])

  const handleRevoke = async (clientId: string, name: string) => {
    try {
      await revoke({ developer_id: developer.id, client_id: clientId }).unwrap()
      toast.success(`Unassigned ${name}`)
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        (err instanceof Error ? err.message : "Failed to unassign")
      toast.error(message)
    }
  }

  const showClientSearch = assignments.length >= 3

  return (
    <div className="rounded-xl border border-border bg-background p-5 space-y-4">
      {/* Header: developer info + count + assign button */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
            {initials(developer)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{fullName(developer)}</div>
            <div className="text-xs text-muted-foreground truncate">{developer.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <UsersIcon className="h-3.5 w-3.5" />
            {showClientSearch && clientSearch
              ? `${filteredAssignments.length} of ${assignments.length}`
              : `${assignments.length} client${assignments.length === 1 ? "" : "s"}`}
          </span>
          <Button size="sm" onClick={() => onAssign(developer, assignments)}>
            <Plus className="h-4 w-4" />
            Assign Clients
          </Button>
        </div>
      </div>

      {/* Per-developer client search (shown when the list is long enough to need it) */}
      {showClientSearch ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search assigned clients…"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      ) : null}

      {/* Body: assigned clients */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-2">Loading assignments…</div>
      ) : assignments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <UsersIcon className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No clients assigned yet.</p>
          <p className="text-xs text-muted-foreground/70">
            Click <span className="font-medium">Assign Clients</span> to add some.
          </p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No assigned clients match &ldquo;{clientSearch}&rdquo;.
        </div>
      ) : (
        <div className="rounded-lg border border-border divide-y overflow-hidden">
          {filteredAssignments.map((a) => (
            <ClientRow
              key={a.id}
              client={a.client}
              developer={developer}
              removing={isRevoking}
              onRemove={() => void handleRevoke(a.client.id, fullName(a.client))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab ─────────────────────────────────────────────────────────────────────

export function AssignmentsTab() {
  const { data: devsResp, isLoading, error } = useGetAccessUsersQuery({
    role: "developer",
  })
  const developers = devsResp?.data ?? []

  const [modalDev, setModalDev] = useState<AccessUserRecord | null>(null)
  const [modalAssignments, setModalAssignments] = useState<AssignmentRecord[]>([])
  const [search, setSearch] = useState("")

  const filteredDevelopers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return developers
    return developers.filter((d) =>
      `${fullName(d)} ${d.email}`.toLowerCase().includes(q),
    )
  }, [developers, search])

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Developers</CardTitle>
        {!isLoading && developers.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {filteredDevelopers.length} of {developers.length}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sticky search bar */}
        {!isLoading && developers.length > 0 ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search developers by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-background p-5 space-y-4"
                style={{ opacity: 1 - i * 0.2 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-muted shrink-0" />
                    <div className="space-y-2">
                      <div className="h-3.5 w-32 rounded bg-muted" />
                      <div className="h-3 w-44 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-16 rounded bg-muted" />
                    <div className="h-8 w-28 rounded-lg bg-muted" />
                  </div>
                </div>
                <div className="rounded-lg border border-border divide-y overflow-hidden">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-36 rounded bg-muted" />
                        <div className="h-2.5 w-48 rounded bg-muted" />
                      </div>
                      <div className="h-8 w-24 rounded-lg bg-muted shrink-0" />
                      <div className="h-8 w-20 rounded-lg bg-muted shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-sm text-destructive text-center">
            Failed to load developers.
          </div>
        ) : developers.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted-foreground text-center">
            No developer accounts yet. Create one from the Users page.
          </div>
        ) : filteredDevelopers.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted-foreground text-center">
            No developers match &ldquo;{search}&rdquo;.
          </div>
        ) : (
          <div className="max-h-[calc(100vh-22rem)] overflow-y-auto pr-1 -mr-1">
            <div className="space-y-4">
              {filteredDevelopers.map((dev) => (
                <DeveloperCard
                  key={dev.id}
                  developer={dev}
                  onAssign={(d, a) => {
                    setModalDev(d)
                    setModalAssignments(a)
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {modalDev ? (
        <AssignClientsModal
          developer={modalDev}
          alreadyAssigned={modalAssignments}
          isOpen={!!modalDev}
          onClose={() => setModalDev(null)}
        />
      ) : null}
    </Card>
  )
}
