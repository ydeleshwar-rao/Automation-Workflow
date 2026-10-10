"use client";

/**
 * DeveloperPermissionsModal
 * ─────────────────────────────────────────────────────────────
 * Edit page permissions for a single developer.
 * Uses can_view / can_edit / can_delete (replacing old can_read / can_write).
 * No client dimension — permissions are user-scoped only.
 */

import { useState }             from "react";
import { toast }                from "sonner";
import { Modal }                from "@/src/components/ui/modal";
import { Button }               from "@/src/components/ui/button";
import { Switch }               from "@/src/components/ui/switch";
import { ACCESS_PAGES }         from "@/src/constants/access-pages.constants";
import {
  useGetPermissionsQuery,
  useUpsertPagePermissionMutation,
  useRemovePagePermissionMutation,
  type DeveloperRecord,
  type PagePermissionRecord,
} from "@/src/components/admin/access/apiIntegrations/accessApi";

interface Props {
  developer: DeveloperRecord;
  isOpen:    boolean;
  onClose:   () => void;
}

type PermMap = Record<string, PagePermissionRecord>;

function normPerms(raw: PagePermissionRecord[] | undefined): PermMap {
  if (!raw) return {};
  return raw.reduce<PermMap>((acc, p) => {
    acc[p.page_key] = p;
    return acc;
  }, {});
}

function displayName(u: { full_name?: string | null; email: string }): string {
  return u.full_name?.trim() || u.email;
}

export function DeveloperPermissionsModal({ developer, isOpen, onClose }: Props) {
  const { data: permsResp, isFetching } = useGetPermissionsQuery(developer.id, {
    skip: !isOpen,
  });
  const [upsertPerm, { isLoading: isSaving }] = useUpsertPagePermissionMutation();
  const [removePerm, { isLoading: isRemoving }] = useRemovePagePermissionMutation();
  const [savingPage, setSavingPage] = useState<string | null>(null);

  const perms = normPerms(permsResp?.data);
  const busy  = isFetching || isSaving || isRemoving;

  const handleToggle = async (
    pageKey: string,
    field: "can_view" | "can_edit" | "can_delete",
    value: boolean,
  ) => {
    const current = perms[pageKey] ?? {
      page_key: pageKey,
      can_view:   false,
      can_edit:   false,
      can_delete: false,
    };

    const next = { ...current, [field]: value };

    // Business rules:
    // - Enabling can_edit or can_delete forces can_view = true
    // - Disabling can_view also disables can_edit + can_delete
    if ((field === "can_edit" || field === "can_delete") && value) {
      next.can_view = true;
    }
    if (field === "can_view" && !value) {
      next.can_edit   = false;
      next.can_delete = false;
    }

    setSavingPage(pageKey);
    try {
      if (!next.can_view && !next.can_edit && !next.can_delete) {
        // No permissions at all → remove the row entirely
        await removePerm({ developerId: developer.id, pageKey }).unwrap();
      } else {
        await upsertPerm({
          developerId: developer.id,
          pageKey,
          data: {
            can_view:   next.can_view,
            can_edit:   next.can_edit,
            can_delete: next.can_delete,
          },
        }).unwrap();
      }
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        (err instanceof Error ? err.message : "Failed to save permission");
      toast.error(message);
    } finally {
      setSavingPage(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Permissions — ${displayName(developer)}`}
      maxWidth="max-w-[560px]"
    >
      <div className="text-left space-y-4">
        <p className="text-sm text-muted-foreground">
          Set page access for{" "}
          <span className="font-medium text-foreground">
            {displayName(developer)}
          </span>
          . Changes take effect on the developer's next token refresh.
        </p>

        <div className="border border-border rounded-lg divide-y overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_72px_72px_80px] gap-2 px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
            <div>Page</div>
            <div className="text-center">View</div>
            <div className="text-center">Edit</div>
            <div className="text-center">Delete</div>
          </div>

          {isFetching ? (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">
              Loading permissions…
            </div>
          ) : (
            ACCESS_PAGES.map((page) => {
              const p        = perms[page.key];
              const canView   = p?.can_view   ?? false;
              const canEdit   = p?.can_edit   ?? false;
              const canDelete = p?.can_delete ?? false;
              const pageBusy  = busy || savingPage === page.key;

              return (
                <div
                  key={page.key}
                  className="grid grid-cols-[1fr_72px_72px_80px] gap-2 px-4 py-3 items-center"
                >
                  <div className="text-sm font-medium">{page.label}</div>

                  <div className="flex justify-center">
                    <Switch
                      checked={canView}
                      disabled={pageBusy}
                      onCheckedChange={(v) =>
                        void handleToggle(page.key, "can_view", v)
                      }
                      aria-label={`${page.label} view`}
                    />
                  </div>

                  <div className="flex justify-center">
                    <Switch
                      checked={canEdit}
                      disabled={pageBusy}
                      onCheckedChange={(v) =>
                        void handleToggle(page.key, "can_edit", v)
                      }
                      aria-label={`${page.label} edit`}
                    />
                  </div>

                  <div className="flex justify-center">
                    <Switch
                      checked={canDelete}
                      disabled={pageBusy}
                      onCheckedChange={(v) =>
                        void handleToggle(page.key, "can_delete", v)
                      }
                      aria-label={`${page.label} delete`}
                    />
                  </div>
                </div>
              );
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
  );
}
