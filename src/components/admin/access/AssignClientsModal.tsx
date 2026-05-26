"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Modal } from "@/src/components/ui/modal"
import { Button } from "@/src/components/ui/button"
import { Checkbox } from "@/src/components/ui/checkbox"
import { Input } from "@/src/components/ui/input"
import {
  useGetAccessUsersQuery,
  useAssignClientsMutation,
  type AccessUserRecord,
  type AssignmentRecord,
} from "@/src/components/admin/access/apiIntegrations/accessApi"

interface Props {
  developer: AccessUserRecord
  alreadyAssigned: AssignmentRecord[]
  isOpen: boolean
  onClose: () => void
}

function displayName(u: { first_name?: string | null; last_name?: string | null; email: string }): string {
  const full = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim()
  return full || u.email
}

export function AssignClientsModal({ developer, alreadyAssigned, isOpen, onClose }: Props) {
  const { data: clientsResp, isLoading } = useGetAccessUsersQuery(
    { role: "user" },
    { skip: !isOpen },
  )
  const [assignClients, { isLoading: isSaving }] = useAssignClientsMutation()

  const allClients = clientsResp?.data ?? []
  const assignedIds = useMemo(
    () => new Set(alreadyAssigned.map((a) => a.client.id)),
    [alreadyAssigned],
  )

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  // Reset selection whenever the modal opens for a new dev
  useEffect(() => {
    if (isOpen) {
      setSelected(new Set())
      setSearch("")
    }
  }, [isOpen, developer.id])

  const visibleClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = allClients.filter((c) => !assignedIds.has(c.id))
    if (!q) return list
    return list.filter((c) =>
      `${displayName(c)} ${c.email}`.toLowerCase().includes(q),
    )
  }, [allClients, assignedIds, search])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    if (selected.size === 0) return
    try {
      await assignClients({
        developer_id: developer.id,
        client_ids: Array.from(selected),
      }).unwrap()
      toast.success(
        `Assigned ${selected.size} client${selected.size === 1 ? "" : "s"} to ${displayName(developer)}`,
      )
      onClose()
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        (err instanceof Error ? err.message : "Failed to assign clients")
      toast.error(message)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign clients to ${displayName(developer)}`}
      maxWidth="max-w-[640px]"
    >
      <div className="text-left space-y-4">
        <Input
          placeholder="Search clients by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="border border-border rounded-lg max-h-80 overflow-y-auto divide-y">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              Loading clients…
            </div>
          ) : visibleClients.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              {allClients.length === 0
                ? "No clients exist yet."
                : "No clients available to assign."}
            </div>
          ) : (
            visibleClients.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/40"
              >
                <Checkbox
                  checked={selected.has(c.id)}
                  onCheckedChange={() => toggle(c.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{displayName(c)}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {selected.size} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={selected.size === 0 || isSaving}
            >
              {isSaving ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
