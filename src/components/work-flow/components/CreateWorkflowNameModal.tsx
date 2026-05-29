"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { X, ChevronDown, Plus } from "lucide-react";

export interface TagOption {
  id: string;
  name: string;
  color?: string;
}

interface CreateWorkflowNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the workflow name and selected tag IDs */
  onCreate: (name: string, tagIds: string[]) => void;
  isLoading?: boolean;
  /** All available tags from the Tags API */
  availableTags?: TagOption[];
  /** Callback to create a new tag on the fly — returns the newly created tag or null */
  onCreateTag?: (name: string) => Promise<TagOption | null>;
}

export function CreateWorkflowNameModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
  availableTags = [],
  onCreateTag,
}: CreateWorkflowNameModalProps) {
  const [workflowName, setWorkflowName] = useState("");
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const tagInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedIds = useMemo(() => new Set(selectedTags.map((t) => t.id)), [selectedTags]);

  // Filter suggestions: match input and exclude already selected
  const filteredSuggestions = useMemo(() => {
    const query = tagInput.trim().toLowerCase();
    return availableTags.filter(
      (tag) =>
        !selectedIds.has(tag.id) &&
        (query === "" || tag.name.toLowerCase().includes(query))
    );
  }, [availableTags, selectedIds, tagInput]);

  // Whether the current input is a brand new tag name
  const canCreateNewTag = useMemo(() => {
    const trimmed = tagInput.trim();
    if (!trimmed || !onCreateTag) return false;
    const lower = trimmed.toLowerCase();
    return !availableTags.some((t) => t.name.toLowerCase() === lower);
  }, [tagInput, availableTags, onCreateTag]);

  const handleSelectTag = (tag: TagOption) => {
    if (selectedIds.has(tag.id)) return;
    setSelectedTags((prev) => [...prev, tag]);
    setTagInput("");
    setIsTagDropdownOpen(false);
    tagInputRef.current?.focus();
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  const handleCreateAndSelect = async () => {
    if (!onCreateTag || !tagInput.trim()) return;
    setIsCreatingTag(true);
    try {
      const newTag = await onCreateTag(tagInput.trim());
      if (newTag) {
        setSelectedTags((prev) => [...prev, newTag]);
        setTagInput("");
        setIsTagDropdownOpen(false);
      }
    } finally {
      setIsCreatingTag(false);
      tagInputRef.current?.focus();
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (canCreateNewTag) {
        handleCreateAndSelect();
      } else if (filteredSuggestions.length === 1) {
        handleSelectTag(filteredSuggestions[0]);
      }
    } else if (e.key === "Backspace" && tagInput === "" && selectedTags.length > 0) {
      setSelectedTags((prev) => prev.slice(0, -1));
    } else if (e.key === "Escape") {
      setIsTagDropdownOpen(false);
    }
  };

  const handleCreate = () => {
    if (workflowName.trim()) {
      onCreate(
        workflowName.trim(),
        selectedTags.map((t) => t.id)
      );
      setWorkflowName("");
      setSelectedTags([]);
      setTagInput("");
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && workflowName.trim()) {
      handleCreate();
    }
  };

  const handleClose = () => {
    setWorkflowName("");
    setSelectedTags([]);
    setTagInput("");
    setIsTagDropdownOpen(false);
    onClose();
  };

  if (!isMounted) return null;
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-popover text-popover-foreground w-full max-w-[450px] rounded-2xl shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Create New Workflow
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Workflow Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Workflow Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g., Send invoice to Xero"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              autoFocus
              className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Tags
            </label>
            <div className="relative" ref={dropdownRef}>
              {/* Tag chips + input */}
              <div
                className="flex flex-wrap items-center gap-1.5 min-h-[40px] w-full px-2.5 py-1.5 border border-input rounded-lg focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent bg-background cursor-text"
                onClick={() => tagInputRef.current?.focus()}
              >
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}25` : undefined,
                      borderColor: tag.color ? `${tag.color}55` : undefined,
                      color: tag.color || undefined,
                    }}
                  >
                    {tag.color && (
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    {tag.name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTag(tag.id);
                      }}
                      className="hover:opacity-70 rounded-sm p-0.5 transition-opacity"
                      disabled={isLoading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="flex-1 min-w-[100px] relative">
                  <input
                    ref={tagInputRef}
                    type="text"
                    placeholder={selectedTags.length === 0 ? "Select or create tags..." : "Add more..."}
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setIsTagDropdownOpen(true);
                    }}
                    onFocus={() => setIsTagDropdownOpen(true)}
                    onKeyDown={handleTagKeyDown}
                    className="w-full border-none outline-none bg-transparent text-sm text-foreground py-0.5 placeholder:text-muted-foreground"
                    disabled={isLoading || isCreatingTag}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsTagDropdownOpen((v) => !v)}
                  className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isTagDropdownOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Dropdown */}
              {isTagDropdownOpen && (filteredSuggestions.length > 0 || canCreateNewTag) && (
                <div className="absolute z-50 mt-1 w-full max-h-[180px] overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
                  {/* Create new tag option */}
                  {canCreateNewTag && (
                    <button
                      type="button"
                      onClick={handleCreateAndSelect}
                      disabled={isCreatingTag}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-primary font-medium border-b border-border"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isCreatingTag ? "Creating..." : `Create "${tagInput.trim()}"`}
                    </button>
                  )}
                  {/* Existing tag suggestions */}
                  {filteredSuggestions.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleSelectTag(tag)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      {tag.color && (
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Press Enter to create a new tag, or select from existing ones
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              onClick={handleClose}
              disabled={isLoading}
              variant="outline"
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!workflowName.trim() || isLoading}
              className="px-4 py-2 rounded-lg"
            >
              {isLoading ? "Creating..." : "Create Workflow"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
