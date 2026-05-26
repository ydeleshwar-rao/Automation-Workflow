"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Modal } from "@/src/components/ui/modal"
import { Button } from "@/src/components/ui/button"
import { Switch } from "@/src/components/ui/switch"
import { ACCESS_PAGES } from "@/src/constants/access-pages.constants"
import {
  useGetDeveloperPermissionsQuery,
  useSetDeveloperPermissionMutation,
  type AccessUserRecord,
} from "@/src/components/admin/access/apiIntegrations/accessApi"

interface Props {
  developer: AccessUserRecord
  client: AccessUserRecord
  isOpen: boolean
  onClose: () => void
}

type PermMap = Record<string, { can_read: boolean; can_write: boolean }>

function fullName(u: { first_name?: string | null; last_name?: string | null; email: string }): string {
  const full = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim()
  return full || u.email
}

function normalizePermissions(
  raw: Array<{ page: string; can_read: boolean; can_write: boolean }> | undefined,
): PermMap {
  if (!raw) return {}
  return raw.reduce<PermMap>((acc, p) => {
    acc[p.page] = { can_read: !!p.can_read, can_write: !!p.can_write }
    return acc
  }, {})
}

export function DeveloperPermissionsModal({ developer, client, isOpen, onClose }: Props) {
  const { data: permsResp, isFetching } = useGetDeveloperPermissionsQuery(
    { developer_id: developer.id, client_user_id: client.id },
    { skip: !isOpen },
  )
  const [setPermission, { isLoading: isSaving }] = useSetDeveloperPermissionMutation()
  const [savingPage, setSavingPage] = useState<string | null>(null)

  const perms = normalizePermissions(permsResp?.data as Array<{ page: string; can_read: boolean; can_write: boolean }> | undefined)
  const busy = isFetching || isSaving

  const handleToggle = async (
    page: string,
    field: "can_read" | "can_write",
    value: boolean,
  ) => {
    const current = perms[page] ?? { can_read: false, can_write: false }
    const next = { ...current, [field]: value }
    if (field === "can_write" && value) next.can_read = true
    if (field === "can_read" && !value) next.can_write = false

    setSavingPage(page)
    try {
      await setPermission({
        developer_id: developer.id,
        client_user_id: client.id,
        page,
        can_read: next.can_read,
        can_write: next.can_write,
      }).unwrap()
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        (err instanceof Error ? err.message : "Failed to save permission")
      toast.error(message)
    } finally {
      setSavingPage(null)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Permissions for ${fullName(developer)}`}
      maxWidth="max-w-[540px]"
    >
      <div className="text-left space-y-4">
        <p className="text-sm text-muted-foreground">
          Set page access for <span className="font-medium text-foreground">{fullName(developer)}</span> on client{" "}
          <span className="font-medium text-foreground">{fullName(client)}</span>
        </p>

        <div className="border border-border rounded-lg divide-y overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_60px_60px] gap-2 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/30">
            <div>Page</div>
            <div className="text-center">Read</div>
            <div className="text-center">Write</div>
          </div>

          {isFetching ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              Loading permissions...
            </div>
          ) : (
            ACCESS_PAGES.map((page) => {
              const p = perms[page.key] ?? { can_read: false, can_write: false }
              const pageBusy = busy || savingPage === page.key
              return (
                <div
                  key={page.key}
                  className="grid grid-cols-[1fr_60px_60px] gap-2 px-4 py-3 items-center"
                >
                  <div className="text-sm font-medium">{page.label}</div>
                  <div className="flex justify-center">
                    <Switch
                      checked={p.can_read}
                      disabled={pageBusy}
                      onCheckedChange={(v) => void handleToggle(page.key, "can_read", v)}
                      aria-label={`${page.label} read`}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={p.can_write}
                      disabled={pageBusy}
                      onCheckedChange={(v) => void handleToggle(page.key, "can_write", v)}
                      aria-label={`${page.label} write`}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
