"use client";

import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { X } from "lucide-react";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  isLoading?: boolean;
  /** When set, the modal acts as a rename dialog */
  initialName?: string;
  mode?: "create" | "rename";
}

export function CreateFolderModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
  initialName = "",
  mode = "create",
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState(initialName);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) setFolderName(initialName);
  }, [isOpen, initialName]);

  const handleCreate = () => {
    if (folderName.trim()) {
      onCreate(folderName.trim());
      setFolderName("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && folderName.trim()) {
      handleCreate();
    }
  };

  const handleClose = () => {
    setFolderName("");
    onClose();
  };

  if (!isMounted) return null;
  if (!isOpen) return null;

  const isRename = mode === "rename";

  return (
    <div
      className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="bg-card text-card-foreground w-full max-w-[450px] rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            {isRename ? "Rename Folder" : "Create New Folder"}
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Folder Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., Client Onboarding"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
              className="w-full h-11 px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground border border-border rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary focus-visible:ring-offset-0 transition-all"
              disabled={isLoading}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              onClick={handleClose}
              disabled={isLoading}
              variant="outline"
              className="px-4 py-2 border-border text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!folderName.trim() || isLoading}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm"
            >
              {isLoading
                ? isRename
                  ? "Saving..."
                  : "Creating..."
                : isRename
                  ? "Save"
                  : "Create Folder"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
