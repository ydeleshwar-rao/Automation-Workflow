"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Trash2,
  Zap,
  Filter,
  X,
  Check,
  MoreVertical,
} from "lucide-react";

interface TagOption {
  id: string;
  name: string;
  color?: string;
}

interface Workflow {
  id: string;
  name: string;
  status: string;
}

interface Props {
  isOpen: boolean;
  isPinned: boolean;
  workflows: Workflow[];
  currentWorkflowId: string | null;
  isAdmin?: boolean;
  tags?: TagOption[];
  onCreate: () => void;
  onCreateWithName?: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onTogglePinned: () => void;
  onExpandHover: () => void;
  onCollapseHover: () => void;
}

export function WorkflowListSidebar({
  isOpen,
  isPinned,
  workflows,
  currentWorkflowId,
  isAdmin = false,
  tags = [],
  onCreate,
  onCreateWithName,
  onSelect,
  onDelete,
  onRename,
  onTogglePinned,
  onExpandHover,
  onCollapseHover,
}: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Refs for menu positioning and outside-click
  const asideRef = useRef<HTMLElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingId) {
      setTimeout(() => editInputRef.current?.focus(), 0);
    }
  }, [editingId]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e: MouseEvent) => {
      if (menuDropdownRef.current?.contains(e.target as Node)) return;
      if (menuTriggerRef.current?.contains(e.target as Node)) return;
      setMenuOpenId(null);
      setMenuPos(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpenId]);

  // Close dropdown when the workflow list is scrolled
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = () => {
      setMenuOpenId(null);
      setMenuPos(null);
    };
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [menuOpenId]);

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, wfId: string) => {
    e.stopPropagation();
    if (menuOpenId === wfId) {
      setMenuOpenId(null);
      setMenuPos(null);
      menuTriggerRef.current = null;
      return;
    }
    const btn = e.currentTarget;
    const aside = asideRef.current;
    if (aside) {
      const btnRect = btn.getBoundingClientRect();
      const asideRect = aside.getBoundingClientRect();
      // `left` = button's right edge relative to aside's left, minus dropdown width (160px = w-40)
      // This right-aligns the dropdown's right edge to the button's right edge.
      setMenuPos({
        top: btnRect.bottom - asideRect.top + 4,
        left: btnRect.right - asideRect.left - 160,
      });
    }
    menuTriggerRef.current = btn;
    setMenuOpenId(wfId);
  };

  const closeMenu = () => {
    setMenuOpenId(null);
    setMenuPos(null);
    menuTriggerRef.current = null;
  };

  const startEditing = (e: React.MouseEvent, wf: Workflow) => {
    e.stopPropagation();
    setEditingId(wf.id);
    setEditValue(wf.name);
  };

  const commitRename = () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (trimmed && onRename) {
      onRename(editingId, trimmed);
    }
    setEditingId(null);
    setEditValue("");
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); commitRename(); }
    if (e.key === "Escape") { e.preventDefault(); cancelRename(); }
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDeleteId) return;
    onDelete(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const handleCreateClick = () => {
    if (onCreateWithName) {
      onCreateWithName();
    } else {
      onCreate();
    }
  };

  const toggleFilterTag = (tagId: string) => {
    setSelectedFilterTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSelectedFilterTags([]);
    setIsFilterOpen(false);
  };

  const filteredWorkflows = useMemo(() => workflows, [workflows]);

  const confirmWorkflow = workflows.find((w) => w.id === confirmDeleteId);
  const activeMenuWorkflow = workflows.find((w) => w.id === menuOpenId);

  return (
    <>
      {/*
        `relative` gives the aside a positioning context so the dropdown menu
        can be positioned with `absolute` relative to it — escaping the
        inner `overflow-y-auto` scroll container without needing a portal.
      */}
      <aside
        ref={asideRef as React.RefObject<HTMLElement>}
        onMouseEnter={onExpandHover}
        onMouseLeave={onCollapseHover}
        className={cn(
          "relative flex h-full shrink-0 flex-col border-r border-border/60 bg-background transition-all duration-300 ease-in-out",
          isOpen ? "w-[240px]" : "w-[56px]"
        )}
      >
        {/* ── Brand header ── */}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Zap className="h-4 w-4" />
          </div>
          {isOpen && (
            <>
              <span className="overflow-hidden whitespace-nowrap text-sm font-bold text-foreground">
                Workflows
              </span>
              {hasMounted && isAdmin && (
                <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                  Admin
                </span>
              )}
              <button
                onClick={onTogglePinned}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={isPinned ? "Collapse workflow sidebar" : "Pin workflow sidebar"}
              >
                {isPinned ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </button>
            </>
          )}
        </div>

        {/* ── Create Workflow button ── */}
        <div className="px-3 pt-4 pb-2 shrink-0">
          {isOpen ? (
            <Button
              onClick={handleCreateClick}
              className="h-9 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Create Workflow
            </Button>
          ) : (
            <Button
              onClick={handleCreateClick}
              size="icon"
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
              title="Create Workflow"
            >
              <Plus className="h-4 w-4 shrink-0" />
            </Button>
          )}
        </div>

        {/* ── Section label + tag filter ── */}
        {isOpen && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                My Workflows
              </span>
              {tags.length > 0 && (
                <button
                  onClick={() => setIsFilterOpen((v) => !v)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                    selectedFilterTags.length > 0
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Filter className="h-3 w-3" />
                  {selectedFilterTags.length > 0 && (
                    <span>{selectedFilterTags.length}</span>
                  )}
                </button>
              )}
            </div>

            {/* Tag filter dropdown */}
            {isFilterOpen && tags.length > 0 && (
              <div className="mt-2 rounded-lg border border-border bg-background p-2 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground">Filter by tag</span>
                  {selectedFilterTags.length > 0 && (
                    <button onClick={clearFilters} className="text-[10px] text-primary hover:underline">
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleFilterTag(tag.id)}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-medium border transition-colors",
                        selectedFilterTags.includes(tag.id)
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      style={
                        tag.color && selectedFilterTags.includes(tag.id)
                          ? { backgroundColor: `${tag.color}15`, borderColor: `${tag.color}40`, color: tag.color }
                          : undefined
                      }
                    >
                      {tag.color && (
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full mr-1"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active filter chips */}
            {selectedFilterTags.length > 0 && !isFilterOpen && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {selectedFilterTags.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                      style={
                        tag.color
                          ? { backgroundColor: `${tag.color}15`, borderColor: `${tag.color}30`, color: tag.color }
                          : undefined
                      }
                    >
                      {tag.name}
                      <button onClick={() => toggleFilterTag(tagId)} className="hover:opacity-70 rounded-sm p-0.5">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Workflow list ── */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 flex flex-col gap-1">
          {filteredWorkflows.map((wf) => (
            <div key={wf.id} className="relative group/row">
              <div
                role="button"
                tabIndex={0}
                onClick={() => { if (editingId !== wf.id) onSelect(wf.id); }}
                onKeyDown={(e) => {
                  if (editingId === wf.id) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(wf.id);
                  }
                }}
                title={!isOpen ? wf.name : undefined}
                className={cn(
                  "group/btn flex w-full items-center gap-2.5 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  "hover:bg-muted/70 hover:border-border",
                  isOpen ? "p-2.5" : "p-1.5 justify-center",
                  wf.id === currentWorkflowId
                    ? "bg-primary/10 border-primary/30"
                    : "border-transparent"
                )}
              >
                {/* Icon with status dot */}
                <div className={cn(
                  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  wf.id === currentWorkflowId
                    ? "bg-primary/15"
                    : "bg-muted group-hover/btn:bg-primary/10"
                )}>
                  <Zap className={cn(
                    "h-4 w-4 transition-colors",
                    wf.id === currentWorkflowId
                      ? "text-primary"
                      : "text-muted-foreground group-hover/btn:text-primary"
                  )} />
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                      wf.status === "active" ? "bg-primary" : "bg-muted-foreground"
                    )}
                  />
                </div>

                {/* Expanded: name (editable) + status + 3-dot menu */}
                {isOpen && (
                  <>
                    <div className="min-w-0 flex-1">
                      {editingId === wf.id ? (
                        /* ── Inline rename input ── */
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            ref={editInputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleRenameKeyDown}
                            onBlur={commitRename}
                            className={cn(
                              "min-w-0 flex-1 rounded-md border border-primary/60 bg-background px-1.5 py-0.5",
                              "text-sm font-medium text-foreground outline-none",
                              "focus:border-primary focus:ring-2 focus:ring-primary/20",
                              "placeholder:text-muted-foreground"
                            )}
                            placeholder="Workflow name"
                          />
                          <button
                            onMouseDown={(e) => { e.preventDefault(); commitRename(); }}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); cancelRename(); }}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        /* ── Static name + status ── */
                        <>
                          <div
                            className="truncate text-sm font-medium text-foreground"
                            onDoubleClick={(e) => startEditing(e, wf)}
                            title={wf.name}
                          >
                            {wf.name}
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-semibold",
                              wf.status === "active" ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {wf.status === "active" ? "Active" : "Paused"}
                          </span>
                        </>
                      )}
                    </div>

                    {/* 3-dot menu button — hidden while editing */}
                    {editingId !== wf.id && (
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={(e) => openMenu(e, wf.id)}
                          title="More options"
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                            "text-muted-foreground hover:bg-muted hover:text-foreground",
                            "opacity-0 group-hover/btn:opacity-100",
                            menuOpenId === wf.id && "opacity-100 bg-muted text-foreground"
                          )}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/*
          Dropdown menu — rendered as a direct child of the aside (outside the
          scroll container) so it is never clipped by overflow-y-auto.
          Positioned with `absolute` relative to the aside via calculated coords.
        */}
        {hasMounted && menuOpenId !== null && menuPos !== null && activeMenuWorkflow && (
          <div
            ref={menuDropdownRef}
            style={{ position: "absolute", top: menuPos.top, left: menuPos.left }}
            className="z-50 w-40 overflow-hidden rounded-xl border border-border bg-background shadow-lg animate-in fade-in zoom-in-95 duration-100"
          >
            {onRename && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const wf = activeMenuWorkflow;
                  closeMenu();
                  startEditing(e, wf);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                Rename
              </button>
            )}
            <div className="mx-2 border-t border-border/60" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const wfId = menuOpenId;
                closeMenu();
                setConfirmDeleteId(wfId);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </aside>

      {/* ── Delete confirmation modal ── */}
      {confirmDeleteId && confirmWorkflow && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
        >
          <div
            className="w-[320px] rounded-2xl border border-border bg-background p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>

            <h3 className="text-base font-semibold text-foreground">
              Delete workflow?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">
                &ldquo;{confirmWorkflow.name}&rdquo;
              </span>{" "}
              will be permanently deleted. This action cannot be undone.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
