"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Switch } from "@/src/components/ui/switch"
import { Button } from "@/src/components/ui/button"
import { ACCESS_PAGES } from "@/src/constants/access-pages.constants"
import {
  useGetAccessUsersQuery,
  useGetPermissionsQuery,
  useSetPermissionMutation,
  type AccessUserRecord,
  type PermissionRecord,
} from "@/src/components/admin/access/apiIntegrations/accessApi"

type PermMap = Record<string, { can_read: boolean; can_write: boolean }>

const ITEMS_PER_PAGE = 5
// 1 col for user · 2 cols (R/W) per page
const GRID_TEMPLATE = `minmax(220px, 1.6fr) repeat(${ACCESS_PAGES.length}, minmax(140px, 1fr))`

function fullName(u: { first_name?: string | null; last_name?: string | null; email: string }): string {
  const full = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim()
  return full || u.email
}

function normalizePermissions(
  raw: PermissionRecord[] | Record<string, { can_read: boolean; can_write: boolean }> | undefined,
): PermMap {
  if (!raw) return {}
  if (Array.isArray(raw)) {
    return raw.reduce<PermMap>((acc, p) => {
      acc[p.page] = { can_read: !!p.can_read, can_write: !!p.can_write }
      return acc
    }, {})
  }
  return raw as PermMap
}

// ── One row per user (loads its own permissions) ────────────────────────────

function UserPermissionRow({ user }: { user: AccessUserRecord }) {
  const { data: permsResp, isFetching } = useGetPermissionsQuery(user.id)
  const [setPermission, { isLoading: isSaving }] = useSetPermissionMutation()

  const perms = normalizePermissions(permsResp?.data)
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

    try {
      await setPermission({
        user_id: user.id,
        page,
        can_read: next.can_read,
        can_write: next.can_write,
      }).unwrap()
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        (err instanceof Error ? err.message : "Failed to save permission")
      toast.error(message)
    }
  }

  return (
    <div
      className="grid gap-4 px-6 py-4 items-center"
      style={{ gridTemplateColumns: GRID_TEMPLATE }}
    >
      <div>
        <div className="font-medium">{fullName(user)}</div>
        <div className="text-xs text-muted-foreground truncate">
          {user.email}
          {isSaving ? " · Saving…" : ""}
        </div>
      </div>
      {ACCESS_PAGES.map((page) => {
        const p = perms[page.key] ?? { can_read: false, can_write: false }
        return (
          <div key={page.key} className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground w-3">
                R
              </span>
              <Switch
                checked={p.can_read}
                disabled={busy}
                onCheckedChange={(v) => void handleToggle(page.key, "can_read", v)}
                aria-label={`${page.label} read for ${fullName(user)}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground w-3">
                W
              </span>
              <Switch
                checked={p.can_write}
                disabled={busy}
                onCheckedChange={(v) => void handleToggle(page.key, "can_write", v)}
                aria-label={`${page.label} write for ${fullName(user)}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tab ─────────────────────────────────────────────────────────────────────

export function PermissionsTab() {
  const { data: usersResp, isLoading, error } = useGetAccessUsersQuery()

  const orderedUsers = useMemo(() => {
    const list = (usersResp?.data ?? []).filter(
      (u) => (u.role ?? "").toLowerCase() !== "admin",
    )
    return list.sort((a, b) => fullName(a).localeCompare(fullName(b)))
  }, [usersResp])

  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(orderedUsers.length / ITEMS_PER_PAGE))
  const paginatedUsers = orderedUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-destructive">
          Failed to load users.
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-36 rounded bg-muted animate-pulse" />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[1200px] animate-pulse">
            {/* Header row */}
            <div
              className="grid gap-4 border-b px-6 py-4"
              style={{ gridTemplateColumns: GRID_TEMPLATE }}
            >
              <div className="h-3.5 w-10 rounded bg-muted" />
              {ACCESS_PAGES.map((page) => (
                <div key={page.key} className="flex justify-center">
                  <div className="h-3.5 w-20 rounded bg-muted" />
                </div>
              ))}
            </div>
            {/* User rows */}
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="grid gap-4 border-b px-6 py-4 items-center"
                style={{ gridTemplateColumns: GRID_TEMPLATE, opacity: 1 - i * 0.15 }}
              >
                {/* User cell */}
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-28 rounded bg-muted" />
                    <div className="h-2.5 w-40 rounded bg-muted" />
                  </div>
                </div>
                {/* R/W switch pairs per page */}
                {ACCESS_PAGES.map((page) => (
                  <div key={page.key} className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-3 rounded bg-muted" />
                      <div className="h-5 w-9 rounded-full bg-muted" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-3 rounded bg-muted" />
                      <div className="h-5 w-9 rounded-full bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {/* Pagination footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="h-3 w-40 rounded bg-muted" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-20 rounded-lg bg-muted" />
                <div className="h-8 w-8 rounded-lg bg-muted" />
                <div className="h-8 w-16 rounded-lg bg-muted" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Non-admin Users</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <div className="min-w-[1200px]">
          <div
            className="grid gap-4 border-b px-6 py-4 text-sm font-medium text-muted-foreground"
            style={{ gridTemplateColumns: GRID_TEMPLATE }}
          >
            <div>User</div>
            {ACCESS_PAGES.map((page) => (
              <div key={page.key} className="text-center">
                {page.label}
              </div>
            ))}
          </div>
          <div className="divide-y">
            {paginatedUsers.length === 0 ? (
              <div className="px-6 py-10 text-sm text-muted-foreground text-center">
                No non-admin users found.
              </div>
            ) : (
              paginatedUsers.map((user) => (
                <UserPermissionRow key={user.id} user={user} />
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            {orderedUsers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            –{Math.min(currentPage * ITEMS_PER_PAGE, orderedUsers.length)} of{" "}
            {orderedUsers.length} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
