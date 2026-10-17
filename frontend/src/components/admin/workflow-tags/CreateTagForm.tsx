"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { useCreateTagMutation } from "@/src/components/work-flow/apiIntegrations/folderTagApi";
import { TagColorPicker } from "./TagColorPicker";
import { DEFAULT_TAG_COLOR } from "./tagColors";

/** Max length enforced by the backend as well. */
const MAX_TAG_NAME_LENGTH = 40;

export function CreateTagForm() {
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState<string>(DEFAULT_TAG_COLOR);
  const [createTag, { isLoading }] = useCreateTagMutation();
  const trimmedName = tagName.trim();

  const submitTag = async () => {
    if (!trimmedName || isLoading) return;
    try {
      await createTag({ name: trimmedName, color: tagColor }).unwrap();
      toast.success(`Tag "${trimmedName}" created`);
      setTagName("");
      setTagColor(DEFAULT_TAG_COLOR);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not create tag"));
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Create a tag</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label htmlFor="new-tag-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Name
          </label>
          <Input
            id="new-tag-name"
            placeholder="e.g., Urgent, Client A"
            value={tagName}
            maxLength={MAX_TAG_NAME_LENGTH}
            onChange={(event) => setTagName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitTag();
            }}
            className="h-9 text-sm"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Color</span>
          <TagColorPicker selectedColor={tagColor} onSelect={setTagColor} />
        </div>
        <Button size="sm" className="h-9" onClick={submitTag} disabled={!trimmedName || isLoading}>
          {isLoading ? "Creating…" : "Create"}
        </Button>
      </div>
    </div>
  );
}
