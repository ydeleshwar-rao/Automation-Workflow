"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, BookmarkPlus, Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { toast } from "sonner";
import { loadProfile } from "@/src/store/localStorage";
import { useCreateTemplateMutation } from "../apiIntegrations/workflowTemplateApi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sourceWorkflowId: string;
  defaultName?: string;
  onCreated?: (templateId: string) => void;
}

export function SaveAsTemplateModal({
  isOpen,
  onClose,
  sourceWorkflowId,
  defaultName = "",
  onCreated,
}: Props) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [createTemplate, { isLoading }] = useCreateTemplateMutation();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setDescription("");
      setCategory("");
      setTag("");
      setIsPublic(false);
    }
  }, [isOpen, defaultName]);

  if (!mounted || !isOpen) return null;

  const handleSubmit = async () => {
    const createdBy = loadProfile()?.userId ?? "";
    if (!createdBy) {
      toast.error("You must be signed in to save a template");
      return;
    }
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!sourceWorkflowId) {
      toast.error("Select a workflow first");
      return;
    }

    try {
      const result = await createTemplate({
        source_workflow_id: sourceWorkflowId,
        name: name.trim(),
        created_by: createdBy,
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        tag: tag.trim() || undefined,
        is_public: isPublic,
      }).unwrap();

      toast.success("Template saved");
      onCreated?.(result.data.id);
      onClose();
    } catch {
      toast.error("Could not save template");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookmarkPlus className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Save as Template</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lead → Welcome Email"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this template do?"
              rows={3}
              disabled={isLoading}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Category
              </label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Sales"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Tag
              </label>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Optional"
                disabled={isLoading}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">Make public</div>
              <div className="text-xs text-muted-foreground">
                Anyone in your workspace can discover and apply this template.
              </div>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save template"
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
