"use client";

import { useMemo, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  ChevronRight,
  FolderOpen,
  Folder,
  FolderPlus,
  MoreVertical,
  Pencil,
  Trash2,
  Inbox,
  LayoutGrid,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { cn } from "@/src/lib/utils";
import type { FolderRecord } from "@/src/components/work-flow/apiIntegrations/folderTagApi";
import type { WorkflowRecord } from "@/src/components/work-flow/apiIntegrations/workflowApi";

export type SpecialFolder = "all" | "unfiled";
export type SelectedFolder = SpecialFolder | string; // string = folder.id

interface FolderTreeProps {
  folders: FolderRecord[];
  workflows: WorkflowRecord[];
  selected: SelectedFolder;
  onSelect: (id: SelectedFolder) => void;
  onCreateRoot: () => void;
  onCreateChild: (parentId: string) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string) => void;
  /** True while a drag is in progress (used to highlight valid drop zones) */
  isDragActive: boolean;
}

interface TreeNode extends FolderRecord {
  children: TreeNode[];
  depth: number;
}

function buildTree(folders: FolderRecord[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const f of folders) {
    byId.set(f.id, { ...f, children: [], depth: 0 });
  }
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parentId = node.parent_id ?? null;
    if (parentId && byId.has(parentId)) {
      const parent = byId.get(parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRecursive = (list: TreeNode[]) => {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    for (const n of list) sortRecursive(n.children);
  };
  sortRecursive(roots);
  // Re-stamp depth from roots since position-only sort can keep stale depth on detached nodes
  const stamp = (list: TreeNode[], depth: number) => {
    for (const n of list) {
      n.depth = depth;
      stamp(n.children, depth + 1);
    }
  };
  stamp(roots, 0);
  return roots;
}

export function FolderTree({
  folders,
  workflows,
  selected,
  onSelect,
  onCreateRoot,
  onCreateChild,
  onRename,
  onDelete,
  isDragActive,
}: FolderTreeProps) {
  const tree = useMemo(() => buildTree(folders), [folders]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allCount = workflows.length;
  const unfiledCount = workflows.filter((w) => !w.folder_id).length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Folders
        </span>
        <button
          onClick={onCreateRoot}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="New folder"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Virtual roots */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          <SpecialNode
            kind="all"
            label="All workflows"
            icon={<LayoutGrid className="h-4 w-4" />}
            count={allCount}
            selected={selected === "all"}
            onSelect={() => onSelect("all")}
            isDragActive={isDragActive}
          />
          <SpecialNode
            kind="unfiled"
            label="Unfiled"
            icon={<Inbox className="h-4 w-4" />}
            count={unfiledCount}
            selected={selected === "unfiled"}
            onSelect={() => onSelect("unfiled")}
            isDragActive={isDragActive}
          />
        </div>

        <div className="mt-3 space-y-0.5">
          {tree.map((node) => (
            <FolderNode
              key={node.id}
              node={node}
              workflows={workflows}
              selected={selected}
              expanded={expanded}
              onToggle={toggle}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
              isDragActive={isDragActive}
            />
          ))}
        </div>

        {tree.length === 0 && (
          <div className="mt-6 rounded-lg border border-dashed border-border/60 px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">No folders yet</p>
            <button
              onClick={onCreateRoot}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              Create folder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Virtual node (All / Unfiled) ─────────────────────────────────────────────

function SpecialNode({
  kind,
  label,
  icon,
  count,
  selected,
  onSelect,
  isDragActive,
}: {
  kind: SpecialFolder;
  label: string;
  icon: React.ReactNode;
  count: number;
  selected: boolean;
  onSelect: () => void;
  isDragActive: boolean;
}) {
  // "Unfiled" accepts workflow drops (clears folder_id). "All" doesn't accept drops.
  const droppable = kind === "unfiled";
  const { isOver, setNodeRef } = useDroppable({
    id: `folder-drop:unfiled`,
    data: { type: "folder-drop", target: "unfiled" },
    disabled: !droppable,
  });

  return (
    <div
      ref={droppable ? setNodeRef : undefined}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        selected
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-muted/60",
        droppable && isDragActive && "ring-1 ring-dashed ring-border",
        droppable && isOver && "bg-primary/15 ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      <span
        className={cn(
          "shrink-0",
          selected ? "text-primary" : "text-muted-foreground"
        )}
      >
        {icon}
      </span>
      <span className="flex-1 truncate font-medium">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-px text-[10px] font-bold",
          selected
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </div>
  );
}

// ── Folder node (recursive) ──────────────────────────────────────────────────

function FolderNode({
  node,
  workflows,
  selected,
  expanded,
  onToggle,
  onSelect,
  onCreateChild,
  onRename,
  onDelete,
  isDragActive,
}: {
  node: TreeNode;
  workflows: WorkflowRecord[];
  selected: SelectedFolder;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: SelectedFolder) => void;
  onCreateChild: (parentId: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isDragActive: boolean;
}) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selected === node.id;
  const childCount = workflows.filter((w) => w.folder_id === node.id).length;
  const hasChildren = node.children.length > 0;

  // Drop target — accepts both workflows and folders
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `folder-drop:${node.id}`,
    data: { type: "folder-drop", target: "folder", folderId: node.id },
  });

  // Drag source — folder itself can be moved/nested
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `folder:${node.id}`,
    data: { type: "folder", folderId: node.id },
  });

  const setRefs = (el: HTMLDivElement | null) => {
    setDropRef(el);
    setDragRef(el);
  };

  return (
    <div>
      <div
        ref={setRefs}
        {...listeners}
        {...attributes}
        className={cn(
          "group flex cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-1 text-sm transition-colors",
          isSelected
            ? "bg-primary/10 text-primary"
            : "text-foreground hover:bg-muted/60",
          isDragActive && "ring-1 ring-dashed ring-border",
          isOver && "bg-primary/15 ring-2 ring-primary",
          isDragging && "opacity-40"
        )}
        style={{ paddingLeft: `${0.5 + node.depth * 0.875}rem` }}
        onClick={(e) => {
          // Don't select on drag start
          if (e.detail === 0) return;
          onSelect(node.id);
        }}
      >
        {/* Chevron / spacer */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors",
            hasChildren
              ? "hover:bg-muted text-muted-foreground"
              : "opacity-0"
          )}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform",
              isExpanded && "rotate-90"
            )}
          />
        </button>

        {/* Icon */}
        <span
          className={cn(
            "shrink-0",
            isSelected ? "text-primary" : "text-muted-foreground"
          )}
        >
          {isExpanded && hasChildren ? (
            <FolderOpen className="h-4 w-4" />
          ) : (
            <Folder className="h-4 w-4" />
          )}
        </span>

        {/* Name */}
        <span
          className="flex-1 truncate font-medium"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onRename(node.id, node.name);
          }}
          title="Double-click to rename"
        >
          {node.name}
        </span>

        {/* Count badge — hides on hover */}
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-px text-[10px] font-bold group-hover:hidden",
            isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {childCount}
        </span>

        {/* 3-dot menu — visible on hover */}
        <div className="ml-auto opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onCreateChild(node.id); }}
              >
                <FolderPlus className="mr-2 h-3.5 w-3.5" />
                Add subfolder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onRename(node.id, node.name); }}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              workflows={workflows}
              selected={selected}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
              isDragActive={isDragActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

