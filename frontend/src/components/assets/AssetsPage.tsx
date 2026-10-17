"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ChevronRight,
  ExternalLink,
  Plus,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";
import { loadProfile, getActiveUserId } from "@/src/store/localStorage";
import { setStoredWorkflowId } from "@/src/components/work-flow/uiOrchestrator/workflowStorage";
import {
  useGetFoldersQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
  type FolderRecord,
} from "@/src/components/work-flow/apiIntegrations/folderTagApi";
import {
  useGetWorkflowsQuery,
  useUpdateWorkflowMutation,
  useDeleteWorkflowMutation,
  useCreateWorkflowMutation,
} from "@/src/components/work-flow/apiIntegrations/workflowApi";
import { CreateFolderModal } from "@/src/components/work-flow/components/CreateFolderModal";
import { FolderTree, type SelectedFolder } from "./FolderTree";
import { WorkflowTable } from "./WorkflowTable";
import { TemplateTable } from "./TemplateTable";
import { ApplyTemplateWizard } from "@/src/components/workflow-templates/components/ApplyTemplateWizard";
import {
  useListTemplatesQuery,
  useUpdateTemplateMutation as useUpdateTemplateMutationTemplate,
  useDeleteTemplateMutation as useDeleteTemplateMutationTemplate,
} from "@/src/components/workflow-templates/apiIntegrations/workflowTemplateApi";
import {
  useListTemplateFoldersQuery,
  useCreateTemplateFolderMutation,
  useUpdateTemplateFolderMutation,
  useDeleteTemplateFolderMutation,
} from "@/src/components/workflow-templates/apiIntegrations/templateFolderApi";
import type {
  WorkflowTemplate as TemplateRecord,
  TemplateFolderRecord,
  TemplateStatus,
} from "@/src/components/workflow-templates/types";
import {
  TemplateFolderTree,
  type SelectedTemplateFolder,
} from "@/src/components/workflow-templates/components/TemplateFolderTree";
import { DeployFolderWizard } from "@/src/components/workflow-templates/components/DeployFolderWizard";

// Tags are managed by admins on the Admin page (/admin/tags)
type Tab = "workflows" | "templates";

export function AssetsPage() {
  const router = useRouter();

  // Resolve the active user/role at render time (not module load) so that
  // switching client/account or "act-as" reflects immediately. Same source of
  // truth as useWorkflowOrchestrator → identical RTK Query cache key →
  // shared cache between AssetsPage and the workflow builder sidebar.
  const userId = useMemo(() => getActiveUserId(), []);
  const isAdmin = useMemo(
    () => (loadProfile()?.role ?? "").toLowerCase() === "admin",
    []
  );

  // activeTab must be declared before queries so skip conditions can reference it
  const [activeTab, setActiveTab] = useState<Tab>("workflows");

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: foldersData } = useGetFoldersQuery(
    { userId, ...(isAdmin ? { role: "admin" } : {}) },
    { skip: activeTab !== "workflows" }
  );
  const { data: workflowsData } = useGetWorkflowsQuery({
    userId,
    ...(isAdmin ? { role: "admin" } : {}),
  });
  const { data: templatesData } = useListTemplatesQuery(
    isAdmin ? undefined : { created_by: userId }
  );
  const { data: tplFoldersData } = useListTemplateFoldersQuery(
    userId ? { created_by: userId } : undefined,
    { skip: !userId || activeTab !== "templates" }
  );

  const folders = useMemo<FolderRecord[]>(() => foldersData?.data ?? [], [foldersData]);
  const workflows = useMemo(() => workflowsData?.data ?? [], [workflowsData]);
  const templates = useMemo<TemplateRecord[]>(() => templatesData?.data ?? [], [templatesData]);
  const templateFolders = useMemo<TemplateFolderRecord[]>(() => tplFoldersData?.data ?? [], [tplFoldersData]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const [createFolderMut] = useCreateFolderMutation();
  const [updateFolderMut] = useUpdateFolderMutation();
  const [deleteFolderMut] = useDeleteFolderMutation();
  const [updateWorkflowMut] = useUpdateWorkflowMutation();
  const [deleteWorkflowMut] = useDeleteWorkflowMutation();
  const [createWorkflowMut] = useCreateWorkflowMutation();
  const [updateTemplateMut] = useUpdateTemplateMutationTemplate();
  const [deleteTemplateMut] = useDeleteTemplateMutationTemplate();
  const [createTemplateFolderMut] = useCreateTemplateFolderMutation();
  const [updateTemplateFolderMut] = useUpdateTemplateFolderMutation();
  const [deleteTemplateFolderMut] = useDeleteTemplateFolderMutation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<SelectedFolder>("all");

  // Folder modal
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<"create" | "rename">("create");
  const [folderModalParent, setFolderModalParent] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<string | null>(null);

  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);

  // Template folder state
  const [selectedTemplateFolder, setSelectedTemplateFolder] = useState<SelectedTemplateFolder>("all");
  const [tplFolderModalOpen, setTplFolderModalOpen] = useState(false);
  const [tplFolderModalMode, setTplFolderModalMode] = useState<"create" | "rename">("create");
  const [tplFolderModalParent, setTplFolderModalParent] = useState<string | null>(null);
  const [renamingTplFolder, setRenamingTplFolder] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteTplFolderId, setConfirmDeleteTplFolderId] = useState<string | null>(null);
  const [deployingFolder, setDeployingFolder] = useState<{ id: string; name: string } | null>(null);

  // DnD state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── Derived: filtered workflows for the right pane ────────────────────────
  const visibleWorkflows = useMemo(() => {
    let list = workflows;
    if (selectedFolder === "all") {
      // no folder filter
    } else if (selectedFolder === "unfiled") {
      list = list.filter((workflow) => !workflow.folder_id);
    } else {
      list = list.filter((workflow) => workflow.folder_id === selectedFolder);
    }
    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.toLowerCase();
      list = list.filter((workflow) => workflow.name.toLowerCase().includes(normalizedQuery));
    }
    return list;
  }, [workflows, selectedFolder, searchQuery]);

  // ── Breadcrumb path for the selected folder ───────────────────────────────
  const breadcrumb = useMemo(() => {
    if (selectedFolder === "all") return ["All workflows"];
    if (selectedFolder === "unfiled") return ["Unfiled"];
    const path: string[] = [];
    let current = folders.find((folder) => folder.id === selectedFolder);
    while (current) {
      path.unshift(current.name);
      current = current.parent_id
        ? folders.find((folder) => folder.id === current!.parent_id)
        : undefined;
    }
    return path.length ? path : ["All workflows"];
  }, [selectedFolder, folders]);

  // ── Folder handlers ───────────────────────────────────────────────────────
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
      try {
        await createFolderMut({
          name,
          user_id: userId,
          parent_id: folderModalParent,
        }).unwrap();
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
        await updateFolderMut({ id: renamingFolder.id, name }).unwrap();
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

  // ── Workflow handlers ─────────────────────────────────────────────────────
  const handleRenameWorkflow = useCallback(
    async (id: string, name: string) => {
      try {
        await updateWorkflowMut({ id, patch: { name } }).unwrap();
        toast.success("Workflow renamed");
      } catch {
        toast.error("Could not rename workflow");
      }
    },
    [updateWorkflowMut]
  );

  const handleToggleStatus = useCallback(
    async (id: string, nextStatus: "active" | "paused") => {
      try {
        await updateWorkflowMut({ id, patch: { status: nextStatus } }).unwrap();
        toast.success(nextStatus === "active" ? "Workflow activated" : "Workflow paused");
      } catch {
        toast.error("Could not update status");
      }
    },
    [updateWorkflowMut]
  );

  const handleDeleteWorkflow = useCallback(
    async (id: string) => {
      try {
        await deleteWorkflowMut(id).unwrap();
        toast.success("Workflow deleted");
      } catch {
        toast.error("Could not delete workflow");
      }
    },
    [deleteWorkflowMut]
  );

  const handleMoveWorkflow = useCallback(
    async (id: string, folderId: string | null) => {
      try {
        await updateWorkflowMut({ id, patch: { folder_id: folderId } }).unwrap();
        toast.success("Workflow moved");
      } catch {
        toast.error("Could not move workflow");
      }
    },
    [updateWorkflowMut]
  );

  const handleOpenWorkflow = useCallback(
    (id: string) => {
      setStoredWorkflowId(id);
      router.push("/dashboard/workflow");
    },
    [router]
  );

  const handleCreateWorkflow = useCallback(async () => {
    try {
      const folderId =
        selectedFolder === "all" || selectedFolder === "unfiled"
          ? null
          : selectedFolder;
      const result = await createWorkflowMut({
        name: "Untitled workflow",
        user_id: userId,
        ...(folderId ? { folder_id: folderId } : {}),
      }).unwrap();
      const newId = result?.data?.id;
      if (newId) {
        setStoredWorkflowId(newId);
        router.push("/dashboard/workflow");
      }
    } catch {
      toast.error("Could not create workflow");
    }
  }, [createWorkflowMut, router, selectedFolder, userId]);

  // ── Folder move (drag) ────────────────────────────────────────────────────
  const handleMoveFolder = useCallback(
    async (id: string, parentId: string | null) => {
      try {
        await updateFolderMut({ id, parent_id: parentId }).unwrap();
        toast.success("Folder moved");
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Could not move folder";
        toast.error(errorMessage);
      }
    },
    [updateFolderMut]
  );

  // ── DnD handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as
      | { type: "workflow"; workflowId: string }
      | { type: "folder"; folderId: string }
      | { type: "template"; templateId: string }
      | undefined;
    const overData = over.data.current as
      | { type: "folder-drop"; target: "folder"; folderId: string }
      | { type: "folder-drop"; target: "unfiled" }
      | { type: "tpl-folder-drop"; target: "folder"; folderId: string }
      | { type: "tpl-folder-drop"; target: "unfiled" }
      | undefined;

    if (!activeData || !overData) return;

    if (activeData.type === "template" && overData.type === "tpl-folder-drop") {
      const targetFolderId = overData.target === "unfiled" ? null : overData.folderId;
      const draggedTemplate = templates.find((template) => template.id === activeData.templateId);
      if (draggedTemplate && (draggedTemplate.template_folder_id ?? null) !== targetFolderId) {
        handleMoveTemplate(activeData.templateId, targetFolderId);
      }
      return;
    }

    if (activeData.type === "workflow" && overData.type === "folder-drop") {
      const targetFolderId = overData.target === "unfiled" ? null : overData.folderId;
      const draggedWorkflow = workflows.find((workflow) => workflow.id === activeData.workflowId);
      if (draggedWorkflow && draggedWorkflow.folder_id !== targetFolderId) {
        handleMoveWorkflow(activeData.workflowId, targetFolderId);
      }
    } else if (activeData.type === "folder" && overData.type === "folder-drop") {
      if (
        overData.target === "folder" &&
        activeData.folderId !== overData.folderId
      ) {
        const current = folders.find((folder) => folder.id === activeData.folderId);
        if ((current?.parent_id ?? null) !== overData.folderId) {
          handleMoveFolder(activeData.folderId, overData.folderId);
        }
      }
    }
  };

  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (selectedTemplateFolder === "unfiled") list = list.filter((template) => !template.template_folder_id);
    else if (selectedTemplateFolder !== "all") list = list.filter((template) => template.template_folder_id === selectedTemplateFolder);
    if (!searchQuery.trim()) return list;
    const normalizedQuery = searchQuery.toLowerCase();
    return list.filter(
      (template) =>
        template.name.toLowerCase().includes(normalizedQuery) ||
        (template.category ?? "").toLowerCase().includes(normalizedQuery)
    );
  }, [templates, selectedTemplateFolder, searchQuery]);

  const folderDeployTemplates = useMemo(
    () => (deployingFolder ? templates.filter((template) => template.template_folder_id === deployingFolder.id) : []),
    [templates, deployingFolder]
  );

  const handleArchiveTemplate = useCallback(
    async (id: string, currentStatus: TemplateStatus) => {
      const nextStatus: TemplateStatus = currentStatus === "archived" ? "active" : "archived";
      try {
        await updateTemplateMut({ id, patch: { status: nextStatus } }).unwrap();
        toast.success(nextStatus === "archived" ? "Template archived" : "Template restored");
      } catch {
        toast.error("Could not update template");
      }
    },
    [updateTemplateMut]
  );

  const handleDeleteTemplate = useCallback(
    async (id: string) => {
      try {
        await deleteTemplateMut(id).unwrap();
        toast.success("Template deleted");
      } catch {
        toast.error("Could not delete template");
      }
    },
    [deleteTemplateMut]
  );

  const handleRenameTemplate = useCallback(
    async (id: string, name: string) => {
      try {
        await updateTemplateMut({ id, patch: { name } }).unwrap();
        toast.success("Template renamed");
      } catch {
        toast.error("Could not rename template");
      }
    },
    [updateTemplateMut]
  );

  const handleMoveTemplate = useCallback(
    async (id: string, folderId: string | null) => {
      try {
        await updateTemplateMut({ id, patch: { template_folder_id: folderId } }).unwrap();
        toast.success("Template moved");
      } catch {
        toast.error("Could not move template");
      }
    },
    [updateTemplateMut]
  );

  // ── Template folder handlers ───────────────────────────────────────────────
  const openCreateTplFolder = useCallback((parentId: string | null) => {
    setTplFolderModalMode("create");
    setRenamingTplFolder(null);
    setTplFolderModalParent(parentId);
    setTplFolderModalOpen(true);
  }, []);

  const openRenameTplFolder = useCallback((id: string, name: string) => {
    setTplFolderModalMode("rename");
    setRenamingTplFolder({ id, name });
    setTplFolderModalOpen(true);
  }, []);

  const handleCreateTplFolder = useCallback(
    async (name: string) => {
      try {
        await createTemplateFolderMut({ name, created_by: userId, parent_id: tplFolderModalParent }).unwrap();
        toast.success(`Folder "${name}" created`);
        setTplFolderModalOpen(false);
        setTplFolderModalParent(null);
      } catch {
        toast.error("Could not create folder");
      }
    },
    [createTemplateFolderMut, tplFolderModalParent, userId]
  );

  const handleRenameTplFolder = useCallback(
    async (name: string) => {
      if (!renamingTplFolder) return;
      try {
        await updateTemplateFolderMut({ id: renamingTplFolder.id, patch: { name } }).unwrap();
        toast.success("Folder renamed");
        setTplFolderModalOpen(false);
        setRenamingTplFolder(null);
      } catch {
        toast.error("Could not rename folder");
      }
    },
    [updateTemplateFolderMut, renamingTplFolder]
  );

  const handleDeleteTplFolder = useCallback(
    async (id: string) => {
      try {
        await deleteTemplateFolderMut(id).unwrap();
        toast.success("Folder deleted");
        setConfirmDeleteTplFolderId(null);
        if (selectedTemplateFolder === id) setSelectedTemplateFolder("all");
      } catch {
        toast.error("Could not delete folder");
      }
    },
    [deleteTemplateFolderMut, selectedTemplateFolder]
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragId(null)}
    >
      <div className="flex h-full max-h-screen flex-col gap-1 overflow-hidden bg-[hsl(var(--surface))] p-1">
        {/* Header card */}
        <div className="shrink-0 rounded-2xl border border-border/60 bg-background px-6 py-4 shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Assets</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Organize, run, and edit all of your workflows in one place
              </p>
            </div>
            {isAdmin && (
              <Badge
                variant="outline"
                className="border-primary/30 text-[10px] font-bold uppercase tracking-wider text-primary"
              >
                Admin
              </Badge>
            )}
          </div>

          {/* Tabs + Search */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
              <TabButton
                active={activeTab === "workflows"}
                onClick={() => {
                  setActiveTab("workflows");
                  setSearchQuery("");
                }}
              >
                <Zap className="h-3.5 w-3.5" />
                Workflows
                <Pill>{workflows.length}</Pill>
              </TabButton>
              <TabButton
                active={activeTab === "templates"}
                onClick={() => {
                  setActiveTab("templates");
                  setSearchQuery("");
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Templates
                <Pill>{templates.length}</Pill>
              </TabButton>
            </div>

            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === "workflows" ? "Search workflows..." : "Search templates..."
                }
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>

            {activeTab === "workflows" ? (
              <Button
                onClick={handleCreateWorkflow}
                className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                New workflow
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/dashboard/workflow-templates")}
                className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4" />
                Browse library
              </Button>
            )}
          </div>
        </div>

        {/* Content card */}
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[0_2px_16px_0_hsl(var(--foreground)/0.06)]">
          {/* Unified sidebar — content switches with active tab, API skips when inactive */}
          <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-border/60 bg-muted/20">
            {activeTab === "workflows" && (
              <FolderTree
                folders={folders}
                workflows={workflows}
                selected={selectedFolder}
                onSelect={setSelectedFolder}
                onCreateRoot={() => openCreateFolder(null)}
                onCreateChild={(parentId) => openCreateFolder(parentId)}
                onRename={openRenameFolder}
                onDelete={(id) => setConfirmDeleteFolderId(id)}
                isDragActive={!!activeDragId}
              />
            )}
            {activeTab === "templates" && (
              <TemplateFolderTree
                folders={templateFolders}
                templates={templates}
                selected={selectedTemplateFolder}
                onSelect={setSelectedTemplateFolder}
                onCreateRoot={() => openCreateTplFolder(null)}
                onCreateChild={(parentId) => openCreateTplFolder(parentId)}
                onRename={openRenameTplFolder}
                onDelete={(id) => setConfirmDeleteTplFolderId(id)}
                onDeploy={(id, name) => setDeployingFolder({ id, name })}
                isDragActive={!!activeDragId}
              />
            )}
          </aside>

          {/* Main content area */}
          <main className="min-w-0 flex-1 overflow-y-auto p-6">
            {activeTab === "workflows" && (
              <>
                {/* Breadcrumbs */}
                <div className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
                  {breadcrumb.map((part, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="h-3 w-3" />}
                      <span
                        className={cn(
                          i === breadcrumb.length - 1 && "font-semibold text-foreground"
                        )}
                      >
                        {part}
                      </span>
                    </span>
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">
                    · {visibleWorkflows.length} workflow
                    {visibleWorkflows.length === 1 ? "" : "s"}
                  </span>
                </div>
                <WorkflowTable
                  workflows={visibleWorkflows}
                  folders={folders}
                  onRename={handleRenameWorkflow}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDeleteWorkflow}
                  onMoveTo={handleMoveWorkflow}
                  onOpen={handleOpenWorkflow}
                  isDragActive={!!activeDragId}
                />
              </>
            )}

            {activeTab === "templates" && (
              <TemplateTable
                templates={filteredTemplates}
                folders={templateFolders}
                onRename={handleRenameTemplate}
                onArchive={handleArchiveTemplate}
                onDelete={handleDeleteTemplate}
                onMoveTo={handleMoveTemplate}
                onApply={(template) => setApplyingTemplateId(template.id)}
                isDragActive={!!activeDragId}
              />
            )}
          </main>
        </div>

        {/* Folder modal */}
        <CreateFolderModal
          isOpen={folderModalOpen}
          onClose={() => {
            setFolderModalOpen(false);
            setRenamingFolder(null);
            setFolderModalParent(null);
          }}
          onCreate={
            folderModalMode === "rename" ? handleRenameFolder : handleCreateFolder
          }
          mode={folderModalMode}
          initialName={renamingFolder?.name ?? ""}
        />

        {/* Template folder create/rename modal */}
        <CreateFolderModal
          isOpen={tplFolderModalOpen}
          onClose={() => { setTplFolderModalOpen(false); setRenamingTplFolder(null); setTplFolderModalParent(null); }}
          onCreate={tplFolderModalMode === "rename" ? handleRenameTplFolder : handleCreateTplFolder}
          mode={tplFolderModalMode}
          initialName={renamingTplFolder?.name ?? ""}
        />

        {/* Template folder delete confirmation */}
        {confirmDeleteTplFolderId && (
          <DeleteConfirmModal
            title="Delete this template folder?"
            description="Templates inside will become unfiled. Subfolders will be deleted."
            onConfirm={() => handleDeleteTplFolder(confirmDeleteTplFolderId)}
            onCancel={() => setConfirmDeleteTplFolderId(null)}
          />
        )}

        {/* Deploy folder wizard */}
        <DeployFolderWizard
          folderId={deployingFolder?.id ?? null}
          folderName={deployingFolder?.name ?? ""}
          folderTemplates={folderDeployTemplates}
          isOpen={!!deployingFolder}
          onClose={() => setDeployingFolder(null)}
        />

        {/* Apply single template wizard */}
        <ApplyTemplateWizard
          templateId={applyingTemplateId}
          isOpen={!!applyingTemplateId}
          onClose={() => setApplyingTemplateId(null)}
        />

        {/* Folder delete confirmation (modal-style overlay) */}
        {confirmDeleteFolderId && (
          <DeleteConfirmModal
            title="Delete this folder?"
            description="Workflows inside will be moved to Unfiled. Subfolders will be deleted."
            onConfirm={() => handleDeleteFolder(confirmDeleteFolderId)}
            onCancel={() => setConfirmDeleteFolderId(null)}
          />
        )}

        {/* Drag overlay */}
        <DragOverlay>
          {activeDragId ? (
            <div className="rounded-lg border border-primary/40 bg-background px-3 py-2 text-sm font-medium shadow-lg">
              {dragLabel(activeDragId, workflows, folders, templates)}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

function dragLabel(
  activeId: string,
  workflows: { id: string; name: string }[],
  folders: { id: string; name: string }[],
  templates: { id: string; name: string }[]
) {
  const [type, id] = activeId.split(":");
  if (type === "workflow") {
    const workflow = workflows.find((candidateWorkflow) => candidateWorkflow.id === id);
    return workflow ? `⚡ ${workflow.name}` : "Workflow";
  }
  if (type === "folder") {
    const folder = folders.find((candidateFolder) => candidateFolder.id === id);
    return folder ? `📁 ${folder.name}` : "Folder";
  }
  if (type === "template") {
    const template = templates.find((candidateTemplate) => candidateTemplate.id === id);
    return template ? `✦ ${template.name}` : "Template";
  }
  return "";
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 rounded-full bg-muted px-1.5 py-px text-[10px] font-bold text-muted-foreground">
      {children}
    </span>
  );
}

function DeleteConfirmModal({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border/60 bg-card text-card-foreground p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
