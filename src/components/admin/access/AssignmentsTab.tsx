"use client";

/**
 * DevelopersTab (formerly AssignmentsTab)
 * ─────────────────────────────────────────────────────────────
 * Admin panel tab: lists all developer accounts and lets the
 * admin create new ones with a temporary password.
 *
 * Architecture:
 *   - Removed client-assignment logic entirely (no "clients" concept)
 *   - Uses new accessApi: listDevelopers, createDeveloper, deleteDeveloper
 *   - Developer is created in Supabase Auth + profile via backend
 */

import { useMemo, useState }    from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { toast }                from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button }  from "@/src/components/ui/button";
import { Input }   from "@/src/components/ui/input";
import { Badge }   from "@/src/components/ui/badge";
import { Modal }   from "@/src/components/ui/modal";
import { DeleteConfirmModal } from "@/src/components/admin/access/DeleteConfirmModal";
import {
  useListDevelopersQuery,
  useCreateDeveloperMutation,
  useDeleteDeveloperMutation,
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

// ── Create Developer Modal ────────────────────────────────────────────────────

interface CreateModalProps {
  isOpen:  boolean;
  onClose: () => void;
}

function CreateDeveloperModal({ isOpen, onClose }: CreateModalProps) {
  const [form, setForm] = useState({ email: "", full_name: "", password: "" });
  const [createDev, { isLoading }] = useCreateDeveloperMutation();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.email.trim()) return;
    try {
      const res = await createDev({
        email:     form.email.trim(),
        full_name: form.full_name.trim() || undefined,
        password:  form.password.trim() || undefined,
      }).unwrap();

      const tp = res.data?.temp_password;
      if (tp) {
        setTempPassword(tp);
      } else {
        toast.success("Developer account created");
        handleClose();
      }
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        (err instanceof Error ? err.message : "Failed to create developer");
      toast.error(message);
    }
  };

  const handleClose = () => {
    setForm({ email: "", full_name: "", password: "" });
    setTempPassword(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Developer Account"
      maxWidth="max-w-[500px]"
    >
      {tempPassword ? (
        /* ── Step 2: show temp password ────────────── */
        <div className="space-y-4 text-left">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              Account created — save this password now
            </p>
            <p className="text-xs text-amber-700 mb-3">
              This is the only time the temporary password is shown. The developer
              should change it after first login.
            </p>
            <code className="block rounded bg-amber-100 px-3 py-2 text-sm font-mono text-amber-900 select-all">
              {tempPassword}
            </code>
          </div>
          <Button className="w-full" onClick={handleClose}>
            Done
          </Button>
        </div>
      ) : (
        /* ── Step 1: create form ───────────────────── */
        <div className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Email <span className="text-destructive">*</span>
            </label>
            <Input
              type="email"
              placeholder="developer@company.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              placeholder="Jane Smith"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Password{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (leave blank to auto-generate)
              </span>
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={!form.email.trim() || isLoading}
            >
              {isLoading ? "Creating…" : "Create Developer"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Developer Row ─────────────────────────────────────────────────────────────

function DeveloperRow({ developer }: { developer: DeveloperRecord }) {
  const [deleteDev, { isLoading: isDeleting }] = useDeleteDeveloperMutation();
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteDev(developer.id).unwrap();
      toast.success(`${displayName(developer)} has been deleted`);
      setShowModal(false);
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        (err instanceof Error ? err.message : "Failed to delete developer");
      toast.error(message);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
          {initials(developer)}
        </div>

        {/* Name + email */}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{displayName(developer)}</div>
          <div className="text-xs text-muted-foreground truncate">{developer.email}</div>
        </div>

        {/* Status */}
        <Badge
          variant={developer.is_active ? "default" : "secondary"}
          className="shrink-0 text-[11px]"
        >
          {developer.is_active ? "Active" : "Inactive"}
        </Badge>

        {/* Delete button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowModal(true)}
          className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/60 gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      {/* Confirmation modal */}
      <DeleteConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        displayName={displayName(developer)}
        email={developer.email}
        accountType="developer"
      />
    </>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────

export function AssignmentsTab() {
  const { data: devsResp, isLoading, error } = useListDevelopersQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const developers = useMemo(() => devsResp?.data ?? [], [devsResp]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return developers;
    return developers.filter((d) =>
      `${displayName(d)} ${d.email}`.toLowerCase().includes(q)
    );
  }, [developers, search]);

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Developers</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create developer accounts and manage their access.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            New Developer
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          {!isLoading && developers.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search developers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          <div className="border border-border rounded-lg divide-y overflow-hidden">
            {isLoading ? (
              <div className="animate-pulse divide-y">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-4"
                    style={{ opacity: 1 - i * 0.25 }}
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
                Failed to load developers.
              </div>
            ) : developers.length === 0 ? (
              <div className="px-5 py-10 text-sm text-muted-foreground text-center">
                No developer accounts yet. Click{" "}
                <span className="font-medium">New Developer</span> to create one.
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

      <CreateDeveloperModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </>
  );
}
