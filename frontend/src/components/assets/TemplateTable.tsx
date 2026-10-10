"use client";

import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  Sparkles,
  GripVertical,
  Pencil,
  Trash2,
  MoreVertical,
  ArrowUpDown,
  Check,
  X,
  Rocket,
  Globe,
  Lock,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import type {
  TemplateFolderRecord,
  TemplateStatus,
  WorkflowTemplate,
} from "@/src/components/workflow-templates/types";

interface TemplateTableProps {
  templates: WorkflowTemplate[];
  folders: TemplateFolderRecord[];
  onRename: (id: string, name: string) => Promise<void> | void;
  onArchive: (id: string, currentStatus: TemplateStatus) => void;
  onDelete: (id: string) => void;
  onMoveTo: (id: string, folderId: string | null) => void;
  onApply: (template: WorkflowTemplate) => void;
  isDragActive: boolean;
}

type SortKey = "name" | "updated_at" | "usage_count";
type SortDir = "asc" | "desc";

// grid: handle | Name | Visibility | Modified | Creator | Used | ⋮
const COLS = "24px minmax(0,1fr) 80px 120px 44px 44px 40px";

export function TemplateTable(props: TemplateTableProps) {
  const { templates, isDragActive } = props;
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sorted = [...templates].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
    if (sortKey === "usage_count") return ((a.usage_count ?? 0) - (b.usage_count ?? 0)) * dir;
    const av = a.updated_at ?? a.created_at ?? "";
    const bv = b.updated_at ?? b.created_at ?? "";
    return av.localeCompare(bv) * dir;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No templates here</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Save a workflow as a template from the workflow builder to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
      {/* Header */}
      <div
        className="grid items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        style={{ gridTemplateColumns: COLS }}
      >
        <span />
        <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground">
          Name <ArrowUpDown className="h-3 w-3" />
        </button>
        <span>Visibility</span>
        <button onClick={() => toggleSort("updated_at")} className="flex items-center gap-1 hover:text-foreground">
          Modified <ArrowUpDown className="h-3 w-3" />
        </button>
        <span title="Creator">By</span>
        <button onClick={() => toggleSort("usage_count")} className="flex items-center gap-1 hover:text-foreground" title="Times applied">
          Used <ArrowUpDown className="h-3 w-3" />
        </button>
        <span />
      </div>

      <div className="divide-y divide-border/60">
        {sorted.map((tpl) => (
          <TemplateRow
            key={tpl.id}
            template={tpl}
            folders={props.folders}
            isConfirmingDelete={confirmDeleteId === tpl.id}
            onAskDelete={() => setConfirmDeleteId(tpl.id)}
            onCancelDelete={() => setConfirmDeleteId(null)}
            onConfirmDelete={() => {
              props.onDelete(tpl.id);
              setConfirmDeleteId(null);
            }}
            onRename={props.onRename}
            onArchive={props.onArchive}
            onMoveTo={props.onMoveTo}
            onApply={props.onApply}
            isDragActive={isDragActive}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function TemplateRow({
  template,
  folders,
  isConfirmingDelete,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onRename,
  onArchive,
  onMoveTo,
  onApply,
  isDragActive,
}: {
  template: WorkflowTemplate;
  folders: TemplateFolderRecord[];
  isConfirmingDelete: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onRename: (id: string, name: string) => Promise<void> | void;
  onArchive: (id: string, currentStatus: TemplateStatus) => void;
  onMoveTo: (id: string, folderId: string | null) => void;
  onApply: (template: WorkflowTemplate) => void;
  isDragActive: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template:${template.id}`,
    data: { type: "template", templateId: template.id },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(template.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setDraftName(template.name);
    setIsEditing(true);
  };

  const commitEdit = async () => {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === template.name) { setIsEditing(false); return; }
    await onRename(template.id, trimmed);
    setIsEditing(false);
  };

  const cancelEdit = () => { setDraftName(template.name); setIsEditing(false); };

  const updatedDate = template.updated_at ?? template.created_at;
  const creatorInitial = (template.created_by ?? "?").slice(0, 1).toUpperCase();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative grid items-center gap-3 px-4 py-3 transition-colors",
        isDragging ? "z-10 bg-background opacity-40 shadow-lg" : "hover:bg-muted/40",
        isDragActive && !isDragging && "pointer-events-auto",
        isConfirmingDelete && "bg-destructive/5"
      )}
      style={{ gridTemplateColumns: COLS }}
    >
      {/* Delete confirm overlay */}
      {isConfirmingDelete && (
        <div className="absolute inset-0 z-10 flex items-center justify-end gap-2 bg-background/95 px-4 backdrop-blur-sm">
          <span className="text-sm font-medium text-destructive">Delete this template?</span>
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={onConfirmDelete}>Yes</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancelDelete}>No</Button>
        </div>
      )}

      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="flex h-6 w-6 cursor-grab touch-none items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground active:cursor-grabbing group-hover:opacity-100"
        title="Drag to move to folder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Name */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-500">
          <Sparkles className="h-4 w-4" />
        </span>
        {isEditing ? (
          <div className="flex flex-1 items-center gap-1">
            <Input
              ref={inputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
              className="h-7 text-sm"
            />
            <button onClick={commitEdit} className="rounded p-1 text-emerald-600 hover:bg-emerald-50"><Check className="h-4 w-4" /></button>
            <button onClick={cancelEdit} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <button
            onClick={() => onApply(template)}
            onDoubleClick={(e) => { e.stopPropagation(); startEditing(); }}
            className="flex-1 truncate text-left text-sm font-medium text-foreground hover:text-primary"
            title="Click to apply · Double-click to rename"
          >
            {template.name}
          </button>
        )}
      </div>

      {/* Visibility */}
      <div>
        {template.is_public ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Globe className="h-3 w-3" />
            Public
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            <Lock className="h-3 w-3" />
            Private
          </span>
        )}
      </div>

      {/* Last modified */}
      <span className="text-xs text-muted-foreground">
        {updatedDate
          ? new Date(updatedDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
          : "—"}
      </span>

      {/* Creator avatar */}
      <div className="flex items-center justify-center">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/90 text-xs font-bold text-background"
          title={`Created by: ${template.created_by ?? "unknown"}`}
        >
          {creatorInitial}
        </span>
      </div>

      {/* Usage count */}
      <div className="flex items-center justify-center">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-500"
          title={`Used ${template.usage_count ?? 0} time(s)`}
        >
          {template.usage_count ?? 0}
        </span>
      </div>

      {/* Actions menu */}
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="More actions">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onApply(template)}>
              <Rocket className="mr-2 h-4 w-4" />
              Apply
            </DropdownMenuItem>
            <DropdownMenuItem onClick={startEditing}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onMoveTo(template.id, null)} disabled={!template.template_folder_id}>
              Move to Unfiled
            </DropdownMenuItem>
            {folders.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {folders.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => onMoveTo(template.id, f.id)}
                    disabled={f.id === template.template_folder_id}
                  >
                    Move to {f.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onArchive(template.id, template.status)}>
              {template.status === "active" ? "Archive" : "Restore"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAskDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
