"use client";

import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  ChevronRight,
  FolderOpen,
  Folder,
  FolderPlus,
  MoreVertical,
  Pencil,
  Rocket,
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
import type { TemplateFolderRecord, WorkflowTemplate } from "../types";

export type SelectedTemplateFolder = string | "all" | "unfiled";

interface Props {
  folders: TemplateFolderRecord[];
  templates: WorkflowTemplate[];
  selected: SelectedTemplateFolder;
  onSelect: (id: SelectedTemplateFolder) => void;
  onCreateRoot: () => void;
  onCreateChild: (parentId: string) => void;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string) => void;
  onDeploy: (id: string, name: string) => void;
  isDragActive: boolean;
}

interface TreeNode extends TemplateFolderRecord {
  children: TreeNode[];
  depth: number;
}

function buildTree(folders: TemplateFolderRecord[]): TreeNode[] {
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
    list.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of list) sortRecursive(n.children);
  };
  sortRecursive(roots);
  const stamp = (list: TreeNode[], depth: number) => {
    for (const n of list) {
      n.depth = depth;
      stamp(n.children, depth + 1);
    }
  };
  stamp(roots, 0);
  return roots;
}

export function TemplateFolderTree({
  folders,
  templates,
  selected,
  onSelect,
  onCreateRoot,
  onCreateChild,
  onRename,
  onDelete,
  onDeploy,
  isDragActive,
}: Props) {
  const tree = useMemo(() => buildTree(folders), [folders]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const countIn = (folderId: string) =>
    templates.filter((t) => t.template_folder_id === folderId).length;

  const allCount = templates.length;
  const unfiledCount = templates.filter((t) => !t.template_folder_id).length;

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

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {/* All templates */}
          <SpecialNode
            kind="all"
            label="All templates"
            icon={<LayoutGrid className="h-4 w-4" />}
            count={allCount}
            selected={selected === "all"}
            onSelect={() => onSelect("all")}
            isDragActive={isDragActive}
          />
          {/* Unfiled */}
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
              templates={templates}
              selected={selected}
              expanded={expanded}
              onToggle={toggle}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
              onDeploy={onDeploy}
              countIn={countIn}
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

// ── Special node (All / Unfiled) ─────────────────────────────────────────────

function SpecialNode({
  kind,
  label,
  icon,
  count,
  selected,
  onSelect,
  isDragActive,
}: {
  kind: "all" | "unfiled";
  label: string;
  icon: React.ReactNode;
  count: number;
  selected: boolean;
  onSelect: () => void;
  isDragActive: boolean;
}) {
  const droppable = kind === "unfiled";
  const { isOver, setNodeRef } = useDroppable({
    id: "tpl-folder-drop:unfiled",
    data: { type: "tpl-folder-drop", target: "unfiled" },
    disabled: !droppable,
  });

  return (
    <div
      ref={droppable ? setNodeRef : undefined}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        selected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/60",
        droppable && isDragActive && "ring-1 ring-dashed ring-border",
        droppable && isOver && "bg-primary/15 ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      <span className={cn("shrink-0", selected ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </span>
      <span className="flex-1 truncate font-medium">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-px text-[10px] font-bold",
          selected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
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
  templates,
  selected,
  expanded,
  onToggle,
  onSelect,
  onCreateChild,
  onRename,
  onDelete,
  onDeploy,
  countIn,
  isDragActive,
}: {
  node: TreeNode;
  templates: WorkflowTemplate[];
  selected: SelectedTemplateFolder;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: SelectedTemplateFolder) => void;
  onCreateChild: (parentId: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDeploy: (id: string, name: string) => void;
  countIn: (folderId: string) => number;
  isDragActive: boolean;
}) {
  const isExpanded = expanded.has(node.id);
  const isSelected = selected === node.id;
  const childCount = countIn(node.id);
  const hasChildren = node.children.length > 0;

  const { isOver, setNodeRef } = useDroppable({
    id: `tpl-folder-drop:${node.id}`,
    data: { type: "tpl-folder-drop", target: "folder", folderId: node.id },
  });

  return (
    <div>
      <div
        ref={setNodeRef}
        className={cn(
          "group flex cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-1 text-sm transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/60",
          isDragActive && "ring-1 ring-dashed ring-border/60",
          isOver && "bg-primary/15 ring-2 ring-primary"
        )}
        style={{ paddingLeft: `${0.5 + node.depth * 0.875}rem` }}
        onClick={() => onSelect(node.id)}
      >
        {/* Chevron / spacer */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors",
            hasChildren ? "hover:bg-muted text-muted-foreground" : "opacity-0"
          )}
        >
          <ChevronRight
            className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")}
          />
        </button>

        {/* Icon */}
        <span className={cn("shrink-0", isSelected ? "text-primary" : "text-muted-foreground")}>
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
                onClick={(e) => { e.stopPropagation(); onDeploy(node.id, node.name); }}
                className="text-indigo-500 focus:text-indigo-500"
              >
                <Rocket className="mr-2 h-3.5 w-3.5" />
                Deploy to user
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
              templates={templates}
              selected={selected}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
              onDeploy={onDeploy}
              countIn={countIn}
              isDragActive={isDragActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
