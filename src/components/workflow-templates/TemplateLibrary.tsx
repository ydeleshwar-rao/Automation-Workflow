"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Filter, Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { Input } from "@/src/components/ui/input";
import { getActiveUserId } from "@/src/store/localStorage";
import {
  useDeleteTemplateMutation,
  useListTemplatesQuery,
  useUpdateTemplateMutation,
} from "./apiIntegrations/workflowTemplateApi";
import {
  useListTemplateFoldersQuery,
  useCreateTemplateFolderMutation,
  useUpdateTemplateFolderMutation,
  useDeleteTemplateFolderMutation,
} from "./apiIntegrations/templateFolderApi";
import type { ListTemplatesParams, TemplateStatus, WorkflowTemplate } from "./types";
import { TemplateCard } from "./components/TemplateCard";
import { EditTemplateModal } from "./components/EditTemplateModal";
import { ApplyTemplateWizard } from "./components/ApplyTemplateWizard";
import {
  TemplateFolderTree,
  type SelectedTemplateFolder,
} from "./components/TemplateFolderTree";
import { DeployFolderWizard } from "./components/DeployFolderWizard";
import { CreateFolderModal } from "@/src/components/work-flow/components/CreateFolderModal";

type OwnerScope = "mine" | "public" | "all";

export function TemplateLibrary() {
  const userId = useMemo(() => getActiveUserId(), []);

  // ── Scope / filter state ───────────────────────────────────────────────────
  const [scope, setScope] = useState<OwnerScope>("mine");
  const [category, setCategory] = useState<string>("");
  const [status, setStatus] = useState<TemplateStatus | "all">("active");
  const [search, setSearch] = useState("");

  // ── Folder state ───────────────────────────────────────────────────────────
  const [selectedFolder, setSelectedFolder] = useState<SelectedTemplateFolder>("all");
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<"create" | "rename">("create");
  const [folderModalParent, setFolderModalParent] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<string | null>(null);
  const [deployingFolder, setDeployingFolder] = useState<{ id: string; name: string } | null>(null);

  // ── Template UI state ──────────────────────────────────────────────────────
  const [editing, setEditing] = useState<WorkflowTemplate | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // ── Template data ──────────────────────────────────────────────────────────
  const queryParams = useMemo<ListTemplatesParams>(() => {
    const params: ListTemplatesParams = {};
    if (scope === "mine" && userId) params.created_by = userId;
    if (scope === "public") params.is_public = true;
    if (category.trim()) params.category = category.trim();
    if (status !== "all") params.status = status;
    return params;
  }, [scope, userId, category, status]);

  const { data, isLoading, isFetching, refetch } = useListTemplatesQuery(queryParams, {
    skip: scope === "mine" && !userId,
  });

  const [deleteTemplate] = useDeleteTemplateMutation();
  const [updateTemplate] = useUpdateTemplateMutation();

  // ── Folder data ────────────────────────────────────────────────────────────
  const { data: foldersData } = useListTemplateFoldersQuery(
    userId ? { created_by: userId } : undefined,
    { skip: !userId }
  );
  const folders = useMemo(() => foldersData?.data ?? [], [foldersData]);

  const [createFolderMut] = useCreateTemplateFolderMutation();
  const [updateFolderMut] = useUpdateTemplateFolderMutation();
  const [deleteFolderMut] = useDeleteTemplateFolderMutation();

  // ── Derived: all templates after search filter ─────────────────────────────
  const allFiltered = useMemo(() => {
    const rows = data?.data ?? [];
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  // ── Derived: templates after folder filter ─────────────────────────────────
  const templates = useMemo(() => {
    if (selectedFolder === "all") return allFiltered;
    if (selectedFolder === "unfiled") return allFiltered.filter((t) => !t.template_folder_id);
    return allFiltered.filter((t) => t.template_folder_id === selectedFolder);
  }, [allFiltered, selectedFolder]);

  // ── Derived: categories for dropdown ──────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set<string>();
    (data?.data ?? []).forEach((t) => { if (t.category) set.add(t.category); });
    return Array.from(set).sort();
  }, [data]);

  // ── Templates in the currently selected folder (for DeployFolderWizard) ───
  const folderTemplates = useMemo(() => {
    if (!deployingFolder) return [];
    return (data?.data ?? []).filter((t) => t.template_folder_id === deployingFolder.id);
  }, [data, deployingFolder]);

  // ── Template handlers ──────────────────────────────────────────────────────
  const handleArchive = async (tpl: WorkflowTemplate) => {
    try {
      const nextStatus: TemplateStatus = tpl.status === "archived" ? "active" : "archived";
      await updateTemplate({ id: tpl.id, patch: { status: nextStatus } }).unwrap();
      toast.success(nextStatus === "archived" ? "Template archived" : "Template restored");
    } catch {
      toast.error("Could not update template");
    }
  };

  const handleDelete = async (tpl: WorkflowTemplate) => {
    if (!confirm(`Delete "${tpl.name}"? This also removes its nodes and mappings.`)) return;
    try {
      await deleteTemplate(tpl.id).unwrap();
      toast.success("Template deleted");
    } catch {
      toast.error("Could not delete template");
    }
  };

  // ── Folder handlers ────────────────────────────────────────────────────────
  const openCreateFolder = useCallback((parentId: string | null) => {
    setFolderModalMode("create");
    setRenamingFolder(null);
    setFolderModalParent(parentId);
    setFolderModalOpen(true);
  }, []);

  const openRenameFolder = useCallback((id: string, name: string) => {
    setFolderModalMode("rename");
    setRenamingFolder({ id, name });
    setFolderModalOpen(true);
  }, []);

  const handleCreateFolder = useCallback(
    async (name: string) => {
      if (!userId) return;
      try {
        await createFolderMut({ name, created_by: userId, parent_id: folderModalParent }).unwrap();
        toast.success(`Folder "${name}" created`);
        setFolderModalOpen(false);
        setFolderModalParent(null);
      } catch {
        toast.error("Could not create folder");
      }
    },
    [createFolderMut, folderModalParent, userId]
  );

  const handleRenameFolder = useCallback(
    async (name: string) => {
      if (!renamingFolder) return;
      try {
        await updateFolderMut({ id: renamingFolder.id, patch: { name } }).unwrap();
        toast.success("Folder renamed");
        setFolderModalOpen(false);
        setRenamingFolder(null);
      } catch {
        toast.error("Could not rename folder");
      }
    },
    [updateFolderMut, renamingFolder]
  );

  const handleDeleteFolder = useCallback(
    async (id: string) => {
      try {
        await deleteFolderMut(id).unwrap();
        toast.success("Folder deleted");
        setConfirmDeleteFolderId(null);
        if (selectedFolder === id) setSelectedFolder("all");
      } catch {
        toast.error("Could not delete folder");
      }
    },
    [deleteFolderMut, selectedFolder]
  );

  // Reset folder selection when scope changes to public (folders don't apply there)
  useEffect(() => {
    if (scope === "public") setSelectedFolder("all");
  }, [scope]);

  const showFolderSidebar = scope !== "public";

  return (
    <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/workflow"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Back to builder"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Workflow Templates
            </h1>
            <p className="text-xs text-muted-foreground">
              Save any workflow as a template and spin up clones for new clients in seconds.
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 lg:flex-row lg:items-center">
        {/* Scope tabs */}
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
          {(
            [
              { key: "mine", label: "My templates" },
              { key: "public", label: "Public" },
              { key: "all", label: "All" },
            ] as { key: OwnerScope; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setScope(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                scope === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, description, or category"
            className="pl-8"
          />
        </div>

        {/* Category + Status */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TemplateStatus | "all")}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All statuses</option>
          </select>
        </div>
      </div>

      {/* Two-pane content */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Folder sidebar — hidden for public scope */}
        {showFolderSidebar && (
          <aside className="w-[240px] shrink-0 overflow-y-auto rounded-xl border border-border/60 bg-background shadow-[0_2px_8px_0_hsl(var(--foreground)/0.04)]">
            <TemplateFolderTree
              folders={folders}
              templates={data?.data ?? []}
              selected={selectedFolder}
              onSelect={setSelectedFolder}
              onCreateRoot={() => openCreateFolder(null)}
              onCreateChild={(parentId) => openCreateFolder(parentId)}
              onRename={openRenameFolder}
              onDelete={(id) => setConfirmDeleteFolderId(id)}
              onDeploy={(id, name) => setDeployingFolder({ id, name })}
              isDragActive={false}
            />
          </aside>
        )}

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 animate-pulse sm:grid-cols-2 lg:grid-cols-3">
              {[1, 0.85, 0.7, 0.6, 0.5, 0.4].map((opacity, i) => (
                <div
                  key={i}
                  className="flex flex-col rounded-xl border border-border/60 bg-background p-4 shadow-sm"
                  style={{ opacity }}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-36 rounded bg-muted" />
                      <div className="flex items-center gap-1.5">
                        <div className="h-4 w-16 rounded-md bg-muted" />
                        <div className="h-4 w-14 rounded-md bg-muted" />
                      </div>
                    </div>
                    <div className="h-6 w-6 shrink-0 rounded-md bg-muted" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-4/5 rounded bg-muted" />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <div className="h-3 w-16 rounded bg-muted" />
                    <div className="h-7 w-24 rounded-md bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <EmptyState scope={scope} hasFolder={selectedFolder !== "all"} />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onApply={(t) => setApplyingId(t.id)}
                  onEdit={(t) => setEditing(t)}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <EditTemplateModal
        template={editing}
        isOpen={!!editing}
        onClose={() => setEditing(null)}
      />
      <ApplyTemplateWizard
        templateId={applyingId}
        isOpen={!!applyingId}
        onClose={() => setApplyingId(null)}
      />
      <CreateFolderModal
        isOpen={folderModalOpen}
        onClose={() => { setFolderModalOpen(false); setRenamingFolder(null); setFolderModalParent(null); }}
        onCreate={folderModalMode === "rename" ? handleRenameFolder : handleCreateFolder}
        mode={folderModalMode}
        initialName={renamingFolder?.name ?? ""}
      />
      <DeployFolderWizard
        folderId={deployingFolder?.id ?? null}
        folderName={deployingFolder?.name ?? ""}
        folderTemplates={folderTemplates}
        isOpen={!!deployingFolder}
        onClose={() => setDeployingFolder(null)}
      />

      {/* Folder delete confirm */}
      {confirmDeleteFolderId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={() => setConfirmDeleteFolderId(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border/60 bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-foreground">Delete this folder?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Templates inside will become unfiled. Subfolders will be deleted.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteFolderId(null)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFolder(confirmDeleteFolderId)}
                className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ scope, hasFolder }: { scope: OwnerScope; hasFolder: boolean }) {
  const copy = hasFolder
    ? "No templates in this folder. Move a template here or create one from the workflow builder."
    : scope === "mine"
    ? "You haven't saved any templates yet. Open a workflow and click \"Save as Template\"."
    : scope === "public"
    ? "No public templates match your filters."
    : "No templates match your filters.";
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
      <Sparkles className="mb-3 h-8 w-8 text-indigo-400" />
      <p className="text-sm font-medium text-foreground">No templates found</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{copy}</p>
    </div>
  );
}
