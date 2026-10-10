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
  Pencil,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
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
  useGetTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  type FolderRecord,
  type TagRecord,
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

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#6b7280",
];

type Tab = "workflows" | "tags" | "templates";

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
  const { data: tagsData } = useGetTagsQuery({
    userId,
    ...(isAdmin ? { role: "admin" } : {}),
  });
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
  const tags = useMemo<TagRecord[]>(() => tagsData?.data ?? [], [tagsData]);
  const workflows = useMemo(() => workflowsData?.data ?? [], [workflowsData]);
  const templates = useMemo<TemplateRecord[]>(() => templatesData?.data ?? [], [templatesData]);
  const templateFolders = useMemo<TemplateFolderRecord[]>(() => tplFoldersData?.data ?? [], [tplFoldersData]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const [createFolderMut] = useCreateFolderMutation();
  const [updateFolderMut] = useUpdateFolderMutation();
  const [deleteFolderMut] = useDeleteFolderMutation();
  const [createTagMut] = useCreateTagMutation();
  const [updateTagMut] = useUpdateTagMutation();
  const [deleteTagMut] = useDeleteTagMutation();
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

  // Tag form state (kept from previous version)
  const [isTagFormOpen, setIsTagFormOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [editingTag, setEditingTag] = useState<{ id: string; name: string; color: string } | null>(null);
  const [confirmDeleteTagId, setConfirmDeleteTagId] = useState<string | null>(null);
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
      list = list.filter((w) => !w.folder_id);
    } else {
      list = list.filter((w) => w.folder_id === selectedFolder);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((w) => w.name.toLowerCase().includes(q));
    }
    return list;
  }, [workflows, selectedFolder, searchQuery]);

  // ── Breadcrumb path for the selected folder ───────────────────────────────
  const breadcrumb = useMemo(() => {
    if (selectedFolder === "all") return ["All workflows"];
    if (selectedFolder === "unfiled") return ["Unfiled"];
    const path: string[] = [];
    let current = folders.find((f) => f.id === selectedFolder);
    while (current) {
      path.unshift(current.name);
      current = current.parent_id
        ? folders.find((f) => f.id === current!.parent_id)
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
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Could not move folder";
        toast.error(msg);
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
      const tpl = templates.find((t) => t.id === activeData.templateId);
      if (tpl && (tpl.template_folder_id ?? null) !== targetFolderId) {
        handleMoveTemplate(activeData.templateId, targetFolderId);
      }
      return;
    }

    if (activeData.type === "workflow" && overData.type === "folder-drop") {
      const targetFolderId = overData.target === "unfiled" ? null : overData.folderId;
      const wf = workflows.find((w) => w.id === activeData.workflowId);
      if (wf && wf.folder_id !== targetFolderId) {
        handleMoveWorkflow(activeData.workflowId, targetFolderId);
      }
    } else if (activeData.type === "folder" && overData.type === "folder-drop") {
      if (
        overData.target === "folder" &&
        activeData.folderId !== overData.folderId
      ) {
        const current = folders.find((f) => f.id === activeData.folderId);
        if ((current?.parent_id ?? null) !== overData.folderId) {
          handleMoveFolder(activeData.folderId, overData.folderId);
        }
      }
    }
  };

  // ── Tag handlers (kept) ───────────────────────────────────────────────────
  const handleCreateTag = useCallback(async () => {
    if (!newTagName.trim()) return;
    try {
      await createTagMut({
        name: newTagName.trim(),
        color: newTagColor,
        user_id: userId,
      }).unwrap();
      toast.success(`Tag "${newTagName.trim()}" created`);
      setNewTagName("");
      setNewTagColor(TAG_COLORS[0]);
      setIsTagFormOpen(false);
    } catch {
      toast.error("Could not create tag");
    }
  }, [createTagMut, newTagName, newTagColor, userId]);

  const handleUpdateTag = useCallback(async () => {
    if (!editingTag) return;
    try {
      await updateTagMut({
        id: editingTag.id,
        patch: { name: editingTag.name, color: editingTag.color },
      }).unwrap();
      toast.success("Tag updated");
      setEditingTag(null);
    } catch {
      toast.error("Could not update tag");
    }
  }, [updateTagMut, editingTag]);

  const handleDeleteTag = useCallback(
    async (id: string) => {
      try {
        await deleteTagMut(id).unwrap();
        toast.success("Tag deleted");
        setConfirmDeleteTagId(null);
      } catch {
        toast.error("Could not delete tag");
      }
    },
    [deleteTagMut]
  );

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const q = searchQuery.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, searchQuery]);

  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (selectedTemplateFolder === "unfiled") list = list.filter((t) => !t.template_folder_id);
    else if (selectedTemplateFolder !== "all") list = list.filter((t) => t.template_folder_id === selectedTemplateFolder);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q)
    );
  }, [templates, selectedTemplateFolder, searchQuery]);

  const folderDeployTemplates = useMemo(
    () => (deployingFolder ? templates.filter((t) => t.template_folder_id === deployingFolder.id) : []),
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
                active={activeTab === "tags"}
                onClick={() => {
                  setActiveTab("tags");
                  setSearchQuery("");
                }}
              >
                <Tag className="h-3.5 w-3.5" />
                Tags
                <Pill>{tags.length}</Pill>
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
                  activeTab === "workflows"
                    ? "Search workflows..."
                    : activeTab === "tags"
                    ? "Search tags..."
                    : "Search templates..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
            ) : activeTab === "tags" ? (
              <Button
                onClick={() => {
                  setIsTagFormOpen(true);
                  setEditingTag(null);
                }}
                className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                New tag
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
            {activeTab === "tags" && (
              <TagSidebar count={tags.length} />
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

            {activeTab === "tags" && (
              <TagsView
                tags={filteredTags}
                isFormOpen={isTagFormOpen}
                newTagName={newTagName}
                newTagColor={newTagColor}
                editingTag={editingTag}
                confirmDeleteId={confirmDeleteTagId}
                onNewTagNameChange={setNewTagName}
                onNewTagColorChange={setNewTagColor}
                onCreateTag={handleCreateTag}
                onCancelCreate={() => {
                  setIsTagFormOpen(false);
                  setNewTagName("");
                }}
                onStartEdit={(tag) => {
                  setEditingTag({
                    id: tag.id,
                    name: tag.name,
                    color: tag.color ?? TAG_COLORS[0],
                  });
                  setIsTagFormOpen(false);
                }}
                onEditChange={(field, value) =>
                  setEditingTag((prev) => (prev ? { ...prev, [field]: value } : null))
                }
                onSaveEdit={handleUpdateTag}
                onCancelEdit={() => setEditingTag(null)}
                onDelete={(id) => setConfirmDeleteTagId(id)}
                onConfirmDelete={handleDeleteTag}
                onCancelDelete={() => setConfirmDeleteTagId(null)}
              />
            )}

            {activeTab === "templates" && (
              <TemplateTable
                templates={filteredTemplates}
                folders={templateFolders}
                onRename={handleRenameTemplate}
                onArchive={handleArchiveTemplate}
                onDelete={handleDeleteTemplate}
                onMoveTo={handleMoveTemplate}
                onApply={(tpl) => setApplyingTemplateId(tpl.id)}
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
    const wf = workflows.find((w) => w.id === id);
    return wf ? `⚡ ${wf.name}` : "Workflow";
  }
  if (type === "folder") {
    const f = folders.find((f) => f.id === id);
    return f ? `📁 ${f.name}` : "Folder";
  }
  if (type === "template") {
    const t = templates.find((t) => t.id === id);
    return t ? `✦ ${t.name}` : "Template";
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
        onClick={(e) => e.stopPropagation()}
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

// ═══════════════════════════════════════════════════════════════════════════════
// Tag sidebar — simple panel shown in the shared sidebar when tags tab is active
// ═══════════════════════════════════════════════════════════════════════════════

function TagSidebar({ count }: { count: number }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Tags
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div
          className="flex cursor-default items-center gap-2 rounded-md bg-primary/10 px-2 py-1.5 text-sm"
        >
          <Tag className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 truncate font-medium text-primary">All tags</span>
          <span className="rounded-full bg-primary/20 px-1.5 py-px text-[10px] font-bold text-primary">
            {count}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tags view (preserved from previous version)
// ═══════════════════════════════════════════════════════════════════════════════

function TagsView({
  tags,
  isFormOpen,
  newTagName,
  newTagColor,
  editingTag,
  confirmDeleteId,
  onNewTagNameChange,
  onNewTagColorChange,
  onCreateTag,
  onCancelCreate,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  tags: TagRecord[];
  isFormOpen: boolean;
  newTagName: string;
  newTagColor: string;
  editingTag: { id: string; name: string; color: string } | null;
  confirmDeleteId: string | null;
  onNewTagNameChange: (v: string) => void;
  onNewTagColorChange: (v: string) => void;
  onCreateTag: () => void;
  onCancelCreate: () => void;
  onStartEdit: (tag: TagRecord) => void;
  onEditChange: (field: "name" | "color", value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  return (
    <div className="space-y-4">
      {isFormOpen && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            Create new tag
          </h4>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Name
              </label>
              <Input
                placeholder="e.g., Urgent, Client A"
                value={newTagName}
                onChange={(e) => onNewTagNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreateTag();
                }}
                autoFocus
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Color
              </label>
              <div className="flex gap-1">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onNewTagColorChange(c)}
                    className={cn(
                      "h-7 w-7 rounded-md border-2 transition-all",
                      newTagColor === c
                        ? "scale-110 border-foreground"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <Button
              size="sm"
              className="h-9"
              onClick={onCreateTag}
              disabled={!newTagName.trim()}
            >
              Create
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={onCancelCreate}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {tags.length === 0 && !isFormOpen && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
            <Tag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No tags yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create tags to label and filter your workflows.
          </p>
        </div>
      )}

      {tags.length > 0 && (
        <div className="space-y-2">
          {tags.map((tag) => {
            const isEditing = editingTag?.id === tag.id;
            const isConfirmingDelete = confirmDeleteId === tag.id;

            return (
              <div
                key={tag.id}
                className="group relative flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 transition-all hover:border-border hover:shadow-sm"
              >
                {isConfirmingDelete && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-background/95 backdrop-blur-sm">
                    <span className="text-sm font-medium text-destructive">
                      Delete this tag?
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => onConfirmDelete(tag.id)}
                    >
                      Yes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={onCancelDelete}
                    >
                      No
                    </Button>
                  </div>
                )}

                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: tag.color || TAG_COLORS[0] }}
                />

                {isEditing ? (
                  <div className="flex flex-1 items-center gap-3">
                    <Input
                      value={editingTag.name}
                      onChange={(e) => onEditChange("name", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onSaveEdit();
                        if (e.key === "Escape") onCancelEdit();
                      }}
                      autoFocus
                      className="h-8 max-w-[200px] flex-1 text-sm"
                    />
                    <div className="flex gap-0.5">
                      {TAG_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => onEditChange("color", c)}
                          className={cn(
                            "h-5 w-5 rounded border-2 transition-all",
                            editingTag.color === c
                              ? "scale-110 border-foreground"
                              : "border-transparent"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <Button size="sm" className="h-7 text-xs" onClick={onSaveEdit}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={onCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {tag.name}
                    </span>
                    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => onStartEdit(tag)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(tag.id)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
