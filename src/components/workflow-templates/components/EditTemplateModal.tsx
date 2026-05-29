"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { toast } from "sonner";
import { useUpdateTemplateMutation } from "../apiIntegrations/workflowTemplateApi";
import { useListTemplateFoldersQuery } from "../apiIntegrations/templateFolderApi";
import { getActiveUserId } from "@/src/store/localStorage";
import type { TemplateStatus, WorkflowTemplate } from "../types";

interface Props {
  template: WorkflowTemplate | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditTemplateModal({ template, isOpen, onClose }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [status, setStatus] = useState<TemplateStatus>("active");
  const [folderId, setFolderId] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  const [updateTemplate, { isLoading }] = useUpdateTemplateMutation();
  const userId = getActiveUserId();
  const { data: foldersData } = useListTemplateFoldersQuery(
    userId ? { created_by: userId } : undefined,
    { skip: !isOpen }
  );
  const folders = foldersData?.data ?? [];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (template && isOpen) {
      setName(template.name);
      setDescription(template.description ?? "");
      setCategory(template.category ?? "");
      setTag(template.tag ?? "");
      setIsPublic(template.is_public);
      setStatus(template.status);
      setFolderId(template.template_folder_id ?? "");
    }
  }, [template, isOpen]);

  if (!mounted || !isOpen || !template) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await updateTemplate({
        id: template.id,
        patch: {
          name: name.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          tag: tag.trim() || null,
          is_public: isPublic,
          status,
          template_folder_id: folderId || null,
        },
      }).unwrap();
      toast.success("Template updated");
      onClose();
    } catch {
      toast.error("Could not update template");
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
          <h2 className="text-lg font-semibold text-foreground">Edit Template</h2>
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
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isLoading}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Category</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} disabled={isLoading} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Tag</label>
              <Input value={tag} onChange={(e) => setTag(e.target.value)} disabled={isLoading} />
            </div>
          </div>

          {/* Folder */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Folder</label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
            >
              <option value="">— Unfiled —</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TemplateStatus)}
              disabled={isLoading}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-primary"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">Public</div>
              <div className="text-xs text-muted-foreground">
                Share this template with everyone in your workspace.
              </div>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
