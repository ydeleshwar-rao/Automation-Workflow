"use client";

import React, { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { getApiErrorMessage } from "@/src/lib/api-error";
import {
  useDeleteTagMutation,
  useUpdateTagMutation,
  type TagRecord,
} from "@/src/components/work-flow/apiIntegrations/folderTagApi";
import { TagColorPicker } from "./TagColorPicker";
import { DEFAULT_TAG_COLOR } from "./tagColors";

type RowMode = "view" | "edit" | "confirm-delete";

/** One tag: shows name and color, with inline edit and a delete confirmation. */
export function TagListItem({ tag }: { tag: TagRecord }) {
  const [mode, setMode] = useState<RowMode>("view");
  const [draftName, setDraftName] = useState(tag.name);
  const [draftColor, setDraftColor] = useState(tag.color ?? DEFAULT_TAG_COLOR);
  const [updateTag, { isLoading: isSaving }] = useUpdateTagMutation();
  const [deleteTag, { isLoading: isDeleting }] = useDeleteTagMutation();

  const startEditing = () => {
    setDraftName(tag.name);
    setDraftColor(tag.color ?? DEFAULT_TAG_COLOR);
    setMode("edit");
  };

  const saveChanges = async () => {
    const trimmedName = draftName.trim();
    if (!trimmedName) return;
    try {
      await updateTag({ id: tag.id, patch: { name: trimmedName, color: draftColor } }).unwrap();
      toast.success("Tag updated");
      setMode("view");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update tag"));
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteTag(tag.id).unwrap();
      toast.success(`Tag "${tag.name}" deleted`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not delete tag"));
      setMode("view");
    }
  };

  return (
    <div className="group relative flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 transition-all hover:border-border hover:shadow-sm">
      {mode === "confirm-delete" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-background/95 backdrop-blur-sm">
          <span className="text-sm font-medium text-destructive">
            Delete &quot;{tag.name}&quot;? It is removed from every workflow.
          </span>
          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={confirmDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setMode("view")}>
            Cancel
          </Button>
        </div>
      )}

      <span
        className="h-4 w-4 shrink-0 rounded-full border border-white shadow-sm"
        style={{ backgroundColor: mode === "edit" ? draftColor : tag.color ?? DEFAULT_TAG_COLOR }}
      />

      {mode === "edit" ? (
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <Input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveChanges();
              if (event.key === "Escape") setMode("view");
            }}
            autoFocus
            className="h-8 max-w-[220px] flex-1 text-sm"
          />
          <TagColorPicker selectedColor={draftColor} onSelect={setDraftColor} isCompact />
          <Button size="sm" className="h-7 text-xs" onClick={saveChanges} disabled={!draftName.trim() || isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setMode("view")}>
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium text-foreground">{tag.name}</span>
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              onClick={startEditing}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Edit ${tag.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMode("confirm-delete")}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete ${tag.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
