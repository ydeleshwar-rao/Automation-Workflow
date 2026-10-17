"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { X, ChevronDown } from "lucide-react";

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
  /** The organization's tags (admins manage them on the Admin page) */
  availableTags?: TagOption[];
  /** Admin switch: when off, the Tags field is hidden */
  isTagsEnabled?: boolean;
}

export function CreateWorkflowNameModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
  availableTags = [],
  isTagsEnabled = false,
}: CreateWorkflowNameModalProps) {
  const [workflowName, setWorkflowName] = useState("");
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const tagInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedIds = useMemo(() => new Set(selectedTags.map((selectedTag) => selectedTag.id)), [selectedTags]);

  // Filter suggestions: match input and exclude already selected
  const filteredSuggestions = useMemo(() => {
    const query = tagInput.trim().toLowerCase();
    return availableTags.filter(
      (tag) =>
        !selectedIds.has(tag.id) &&
        (query === "" || tag.name.toLowerCase().includes(query))
    );
  }, [availableTags, selectedIds, tagInput]);

  const handleSelectTag = (tag: TagOption) => {
    if (selectedIds.has(tag.id)) return;
    setSelectedTags((prev) => [...prev, tag]);
    setTagInput("");
    setIsTagDropdownOpen(false);
    tagInputRef.current?.focus();
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag.id !== tagId));
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (filteredSuggestions.length === 1) {
        handleSelectTag(filteredSuggestions[0]);
      }
    } else if (event.key === "Backspace" && tagInput === "" && selectedTags.length > 0) {
      setSelectedTags((prev) => prev.slice(0, -1));
    } else if (event.key === "Escape") {
      setIsTagDropdownOpen(false);
    }
  };

  const handleCreate = () => {
    if (workflowName.trim()) {
      onCreate(
        workflowName.trim(),
        selectedTags.map((selectedTag) => selectedTag.id)
      );
      setWorkflowName("");
      setSelectedTags([]);
      setTagInput("");
    }
  };

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && workflowName.trim()) {
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
        onClick={(event) => event.stopPropagation()}
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
              onChange={(event) => setWorkflowName(event.target.value)}
              onKeyDown={handleNameKeyDown}
              autoFocus
              className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Tags — only when the admin has tagging turned on */}
          {isTagsEnabled && (
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
                      onClick={(event) => {
                        event.stopPropagation();
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
                    placeholder={selectedTags.length === 0 ? "Select tags..." : "Add more..."}
                    value={tagInput}
                    onChange={(event) => {
                      setTagInput(event.target.value);
                      setIsTagDropdownOpen(true);
                    }}
                    onFocus={() => setIsTagDropdownOpen(true)}
                    onKeyDown={handleTagKeyDown}
                    className="w-full border-none outline-none bg-transparent text-sm text-foreground py-0.5 placeholder:text-muted-foreground"
                    disabled={isLoading || availableTags.length === 0}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsTagDropdownOpen((wasOpen) => !wasOpen)}
                  className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isTagDropdownOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Dropdown */}
              {isTagDropdownOpen && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-[180px] overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
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
              {availableTags.length === 0
                ? "No tags yet. Your admin can create them on the Admin page."
                : "Select from your company's tags"}
            </p>
          </div>
          )}

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
