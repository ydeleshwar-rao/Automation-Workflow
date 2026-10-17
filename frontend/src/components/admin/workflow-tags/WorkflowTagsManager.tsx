"use client";

import React from "react";
import { Loader2, Tag } from "lucide-react";
import { getApiErrorMessage } from "@/src/lib/api-error";
import { useGetTagSettingsQuery, useGetTagsQuery } from "@/src/components/work-flow/apiIntegrations/folderTagApi";
import { TagSettingsCard } from "./TagSettingsCard";
import { CreateTagForm } from "./CreateTagForm";
import { TagListItem } from "./TagListItem";

/** Admin page body: the on/off switch plus the organization's shared tag list. */
export function WorkflowTagsManager() {
  const settingsQuery = useGetTagSettingsQuery();
  const tagsQuery = useGetTagsQuery();
  const loadError = settingsQuery.error ?? tagsQuery.error;

  if (loadError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {getApiErrorMessage(loadError, "Could not load workflow tags")}
      </div>
    );
  }

  if (settingsQuery.isLoading || tagsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const tags = tagsQuery.data?.data ?? [];
  return (
    <>
      <TagSettingsCard isEnabled={settingsQuery.data?.data?.enabled ?? false} />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Tags ({tags.length})</h2>
        <CreateTagForm />

        {tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
              <Tag className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No tags yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Create tags your team can use to label and filter workflows.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <TagListItem key={tag.id} tag={tag} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
