"use client";

/**
 * PermissionsTab
 * ─────────────────────────────────────────────────────────────
 * Shows all developer accounts in a table. Admin can:
 *   - See each developer's name, email, status
 *   - Click "Permissions" to open DeveloperPermissionsModal
 *   - Toggle active / inactive status
 *
 * Architecture:
 *   - Removed client-assignment logic entirely
 *   - Uses new accessApi (listDevelopers, toggleDeveloperStatus)
 *   - can_view / can_edit / can_delete model
 */

import { useMemo, useState } from "react";
import { Shield, UserCheck, UserX, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button }     from "@/src/components/ui/button";
import { Input }      from "@/src/components/ui/input";
import { Badge }      from "@/src/components/ui/badge";
import {
  useListDevelopersQuery,
  useToggleDeveloperStatusMutation,
  type DeveloperRecord,
} from "@/src/components/admin/access/apiIntegrations/accessApi";
import { DeveloperPermissionsModal } from "./DeveloperPermissionsModal";

// ── Helpers ──────────────────────────────────────────────────────────────────

function displayName(u: DeveloperRecord): string {
  return u.full_name?.trim() || u.email;
}

function initials(u: DeveloperRecord): string {
  const name = u.full_name?.trim() ?? "";
  if (name) {
    const parts = name.split(" ");
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return (u.email[0] ?? "?").toUpperCase();
}

// ── Row ───────────────────────────────────────────────────────────────────────

function DeveloperRow({ developer }: { developer: DeveloperRecord }) {
  const [showPerms, setShowPerms] = useState(false);
  const [toggleStatus, { isLoading: isToggling }] =
    useToggleDeveloperStatusMutation();

  const handleToggle = async () => {
    try {
      await toggleStatus({
        id:        developer.id,
        is_active: !developer.is_active,
      }).unwrap();
      toast.success(
        `${displayName(developer)} ${developer.is_active ? "deactivated" : "activated"}`
      );
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        (err instanceof Error ? err.message : "Failed to update status");
      toast.error(message);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
          {initials(developer)}
        </div>

        {/* Name + email */}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">
            {displayName(developer)}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {developer.email}
          </div>
        </div>

        {/* Status badge */}
        <Badge
          variant={developer.is_active ? "default" : "secondary"}
          className="shrink-0 text-[11px]"
        >
          {developer.is_active ? "Active" : "Inactive"}
        </Badge>

        {/* Permissions button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowPerms(true)}
          className="shrink-0"
        >
          <Shield className="h-4 w-4" />
          Permissions
        </Button>

        {/* Toggle status */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleToggle()}
          disabled={isToggling}
          className={
            developer.is_active
              ? "shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
              : "shrink-0 text-green-600 border-green-300 hover:bg-green-50"
          }
        >
          {developer.is_active ? (
            <><UserX className="h-4 w-4" />Deactivate</>
          ) : (
            <><UserCheck className="h-4 w-4" />Activate</>
          )}
        </Button>
      </div>

      <DeveloperPermissionsModal
        developer={developer}
        isOpen={showPerms}
        onClose={() => setShowPerms(false)}
      />
    </>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────

export function PermissionsTab() {
  const { data: devsResp, isLoading, error } = useListDevelopersQuery();
  const [search, setSearch] = useState("");

  const developers = useMemo(() => devsResp?.data ?? [], [devsResp]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return developers;
    return developers.filter((d) =>
      `${displayName(d)} ${d.email}`.toLowerCase().includes(q)
    );
  }, [developers, search]);

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-destructive">
          Failed to load developers.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-36 rounded bg-muted animate-pulse" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="animate-pulse divide-y">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-4"
                style={{ opacity: 1 - i * 0.2 }}
              >
                <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-36 rounded bg-muted" />
                  <div className="h-2.5 w-52 rounded bg-muted" />
                </div>
                <div className="h-5 w-14 rounded-full bg-muted shrink-0" />
                <div className="h-8 w-28 rounded-lg bg-muted shrink-0" />
                <div className="h-8 w-24 rounded-lg bg-muted shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Developer Permissions</CardTitle>
        {developers.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {developers.length}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        {developers.length > 0 && (
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
        )}

        <div className="border border-border rounded-lg divide-y overflow-hidden">
          {developers.length === 0 ? (
            <div className="px-5 py-10 text-sm text-muted-foreground text-center">
              No developer accounts yet. Create one from the{" "}
              <span className="font-medium">Users</span> page.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-10 text-sm text-muted-foreground text-center">
              No developers match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filtered.map((dev) => (
              <DeveloperRow key={dev.id} developer={dev} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
