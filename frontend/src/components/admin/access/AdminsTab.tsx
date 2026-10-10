"use client";

/**
 * AdminsTab
 * ─────────────────────────────────────────────────────────────
 * Lists all admin accounts with the ability to delete them.
 *
 * Guards (enforced on backend too):
 *   - Cannot delete yourself (you are logged in)
 *   - Cannot delete the last remaining admin
 *
 * Disabled buttons are always visible with a tooltip so the
 * admin understands why they can't delete a particular account.
 */

import { useMemo, useState }                from "react";
import { Shield, Trash2, Search, Crown }    from "lucide-react";
import { toast }                            from "sonner";
import { useSelector }                      from "react-redux";
import type { RootState }                   from "@/src/store/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button }  from "@/src/components/ui/button";
import { Input }   from "@/src/components/ui/input";
import { Badge }   from "@/src/components/ui/badge";
import { DeleteConfirmModal } from "@/src/components/admin/access/DeleteConfirmModal";
import {
  useListAdminsQuery,
  useDeleteAdminMutation,
  type DeveloperRecord,
} from "@/src/components/admin/access/apiIntegrations/accessApi";

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

// ── Admin Row ─────────────────────────────────────────────────────────────────

interface AdminRowProps {
  admin:        DeveloperRecord;
  isSelf:       boolean;
  isLastAdmin:  boolean;
  totalAdmins:  number;
}

function AdminRow({ admin, isSelf, isLastAdmin, totalAdmins }: AdminRowProps) {
  const [deleteAdmin, { isLoading: isDeleting }] = useDeleteAdminMutation();
  const [showModal, setShowModal]                = useState(false);

  // Cannot delete yourself OR the last remaining admin
  const canDelete = !isSelf && !isLastAdmin;

  // Tooltip text when button is disabled
  const disabledReason = isSelf
    ? "You cannot delete your own account"
    : isLastAdmin
    ? "There must be at least one admin — add another before deleting"
    : null;

  const handleDelete = async () => {
    try {
      await deleteAdmin(admin.id).unwrap();
      toast.success(`${displayName(admin)} has been deleted`);
      setShowModal(false);
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        (err instanceof Error ? err.message : "Failed to delete admin");
      toast.error(message);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
        {/* Avatar */}
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
          {initials(admin)}
          {isSelf && (
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary border-2 border-background">
              <Crown className="h-2 w-2 text-primary-foreground" />
            </span>
          )}
        </div>

        {/* Name + email */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{displayName(admin)}</span>
            {isSelf && (
              <span className="shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                You
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">{admin.email}</div>
        </div>

        {/* Total admin count badge (only show when relevant) */}
        {totalAdmins === 1 && (
          <Badge variant="outline" className="shrink-0 text-[10px] border-amber-400/50 text-amber-600 dark:text-amber-400">
            Only admin
          </Badge>
        )}

        {/* Status */}
        <Badge
          variant={admin.is_active ? "default" : "secondary"}
          className="shrink-0 text-[11px]"
        >
          {admin.is_active ? "Active" : "Inactive"}
        </Badge>

        {/* Delete button — always visible, disabled when not allowed */}
        <div className="shrink-0" title={disabledReason ?? undefined}>
          <Button
            size="sm"
            variant="outline"
            disabled={!canDelete}
            onClick={() => canDelete && setShowModal(true)}
            className={
              canDelete
                ? "text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/60 gap-1.5"
                : "opacity-40 cursor-not-allowed gap-1.5"
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Confirmation modal */}
      <DeleteConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        displayName={displayName(admin)}
        email={admin.email}
        accountType="admin"
      />
    </>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────

export function AdminsTab() {
  const { data: adminsResp, isLoading, error } = useListAdminsQuery();
  const [search, setSearch] = useState("");

  const { user: currentUser } = useSelector((s: RootState) => s.access);

  const admins = useMemo(() => adminsResp?.data ?? [], [adminsResp]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) =>
      `${displayName(a)} ${a.email}`.toLowerCase().includes(q)
    );
  }, [admins, search]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Admin Accounts
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin accounts have full system access. You cannot delete yourself or the last admin.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        {!isLoading && admins.length > 1 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search admins…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        <div className="border border-border rounded-lg divide-y overflow-hidden">
          {isLoading ? (
            /* Skeleton */
            <div className="animate-pulse divide-y">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{ opacity: 1 - i * 0.4 }}
                >
                  <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-36 rounded bg-muted" />
                    <div className="h-2.5 w-52 rounded bg-muted" />
                  </div>
                  <div className="h-5 w-14 rounded-full bg-muted shrink-0" />
                  <div className="h-8 w-20 rounded-lg bg-muted shrink-0" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="px-5 py-10 text-sm text-destructive text-center">
              Failed to load admin accounts.
            </div>
          ) : admins.length === 0 ? (
            <div className="px-5 py-10 text-sm text-muted-foreground text-center">
              No admin accounts found.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-10 text-sm text-muted-foreground text-center">
              No admins match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filtered.map((admin) => (
              <AdminRow
                key={admin.id}
                admin={admin}
                isSelf={admin.id === currentUser?.id}
                isLastAdmin={admins.length === 1}
                totalAdmins={admins.length}
              />
            ))
          )}
        </div>

        {/* Warning banner */}
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/40 px-4 py-3 flex items-start gap-2.5">
          <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Deleting an admin permanently removes their account and all associated data.
            At least one admin account must exist at all times.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
