"use client";

import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  Zap,
  MapPin,
  Pencil,
  Trash2,
  MoreVertical,
  GripVertical,
  ArrowRight,
  ArrowUpDown,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Switch } from "@/src/components/ui/switch";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import type { WorkflowRecord } from "@/src/components/work-flow/apiIntegrations/workflowApi";
import type { FolderRecord } from "@/src/components/work-flow/apiIntegrations/folderTagApi";

interface WorkflowTableProps {
  workflows: WorkflowRecord[];
  folders: FolderRecord[];
  onRename: (id: string, name: string) => Promise<void> | void;
  onToggleStatus: (id: string, nextStatus: "active" | "paused") => void;
  onDelete: (id: string) => void;
  onMoveTo: (id: string, folderId: string | null) => void;
  onOpen: (id: string) => void;
  isDragActive: boolean;
}

type SortKey = "name" | "updated_at" | "status";
type SortDir = "asc" | "desc";

export function WorkflowTable(props: WorkflowTableProps) {
  const { workflows } = props;
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sorted = [...workflows].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "name") {
      return a.name.localeCompare(b.name) * dir;
    }
    if (sortKey === "status") {
      return (a.status || "").localeCompare(b.status || "") * dir;
    }
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

  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
          <Zap className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No workflows here</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Drag workflows into this folder, or create a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
      {/* Header row */}
      <div className="grid grid-cols-[24px_minmax(0,1fr)_120px_180px_140px_80px_64px_40px] items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span />
        <button
          onClick={() => toggleSort("name")}
          className="flex items-center gap-1 hover:text-foreground"
        >
          Name <ArrowUpDown className="h-3 w-3" />
        </button>
        <span>Apps</span>
        <span>Location</span>
        <button
          onClick={() => toggleSort("updated_at")}
          className="flex items-center gap-1 hover:text-foreground"
        >
          Last modified <ArrowUpDown className="h-3 w-3" />
        </button>
        <button
          onClick={() => toggleSort("status")}
          className="flex items-center gap-1 hover:text-foreground"
        >
          Status <ArrowUpDown className="h-3 w-3" />
        </button>
        <span>Owner</span>
        <span />
      </div>

      <div className="divide-y divide-border/60">
        {sorted.map((wf) => (
          <WorkflowRow
            key={wf.id}
            workflow={wf}
            folders={props.folders}
            isConfirmingDelete={confirmDeleteId === wf.id}
            onAskDelete={() => setConfirmDeleteId(wf.id)}
            onCancelDelete={() => setConfirmDeleteId(null)}
            onConfirmDelete={() => {
              props.onDelete(wf.id);
              setConfirmDeleteId(null);
            }}
            onRename={props.onRename}
            onToggleStatus={props.onToggleStatus}
            onMoveTo={props.onMoveTo}
            onOpen={props.onOpen}
            isDragActive={props.isDragActive}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function WorkflowRow({
  workflow,
  folders,
  isConfirmingDelete,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onRename,
  onToggleStatus,
  onMoveTo,
  onOpen,
  isDragActive,
}: {
  workflow: WorkflowRecord;
  folders: FolderRecord[];
  isConfirmingDelete: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onRename: (id: string, name: string) => Promise<void> | void;
  onToggleStatus: (id: string, nextStatus: "active" | "paused") => void;
  onMoveTo: (id: string, folderId: string | null) => void;
  onOpen: (id: string) => void;
  isDragActive: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `workflow:${workflow.id}`,
    data: { type: "workflow", workflowId: workflow.id },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(workflow.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setDraftName(workflow.name);
    setIsEditing(true);
  };

  const commitEdit = async () => {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === workflow.name) {
      setIsEditing(false);
      return;
    }
    await onRename(workflow.id, trimmed);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setDraftName(workflow.name);
    setIsEditing(false);
  };

  const folder = folders.find((f) => f.id === workflow.folder_id);
  const updatedDate = workflow.updated_at ?? workflow.created_at;
  const isActive = workflow.status === "active";

  return (
    <div
      ref={setDragRef}
      className={cn(
        "group relative grid grid-cols-[24px_minmax(0,1fr)_120px_180px_140px_80px_64px_40px] items-center gap-3 px-4 py-3 transition-colors",
        isDragging
          ? "z-10 bg-background opacity-40 shadow-lg"
          : "hover:bg-muted/40",
        isDragActive && !isDragging && "pointer-events-auto",
        isConfirmingDelete && "bg-destructive/5"
      )}
    >
      {/* Delete confirm overlay */}
      {isConfirmingDelete && (
        <div className="absolute inset-0 z-10 flex items-center justify-end gap-2 bg-background/95 px-4 backdrop-blur-sm">
          <span className="text-sm font-medium text-destructive">
            Delete this workflow?
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs"
            onClick={onConfirmDelete}
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

      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="flex h-6 w-6 cursor-grab touch-none items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground active:cursor-grabbing group-hover:opacity-100"
        title="Drag to move"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Name */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-600">
          <Zap className="h-4 w-4 fill-current" />
        </span>
        {isEditing ? (
          <div className="flex flex-1 items-center gap-1">
            <Input
              ref={inputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              className="h-7 text-sm"
            />
            <button
              onClick={commitEdit}
              className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
              title="Save"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={cancelEdit}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onOpen(workflow.id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              startEditing();
            }}
            className="flex-1 truncate text-left text-sm font-medium text-foreground hover:text-primary"
            title="Click to open · Double-click to rename"
          >
            {workflow.name}
          </button>
        )}
      </div>

      {/* Apps placeholder (icons can be wired up to integration_keys later) */}
      <div className="flex items-center gap-1">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
          ⚡
        </span>
      </div>

      {/* Location (folder) */}
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate">{folder?.name ?? "Unfiled"}</span>
      </div>

      {/* Last modified */}
      <span className="text-xs text-muted-foreground">
        {updatedDate
          ? new Date(updatedDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—"}
      </span>

      {/* Status switch */}
      <div className="flex items-center">
        <Switch
          checked={isActive}
          onCheckedChange={(v) => onToggleStatus(workflow.id, v ? "active" : "paused")}
        />
      </div>

      {/* Owner */}
      <div className="flex items-center justify-center">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/90 text-xs font-bold text-background">
          {workflow.user_id?.slice(0, 1).toUpperCase() ?? "?"}
        </span>
      </div>

      {/* Actions menu */}
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onOpen(workflow.id)}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={startEditing}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onMoveTo(workflow.id, null)}
              disabled={!workflow.folder_id}
            >
              Move to Unfiled
            </DropdownMenuItem>
            {folders.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {folders.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => onMoveTo(workflow.id, f.id)}
                    disabled={f.id === workflow.folder_id}
                  >
                    Move to {f.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onAskDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
