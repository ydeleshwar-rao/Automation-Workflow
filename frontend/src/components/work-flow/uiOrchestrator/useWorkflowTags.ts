import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useCreateTagMutation, useGetTagsQuery } from "../apiIntegrations/folderTagApi";
import type { OwnerQueryArgs } from "./useCurrentUserScope";

/** Tags offered by the builder's filter and "new workflow" dialog. Full tag management lives on the Assets page. */
export function useWorkflowTags(ownerQueryArgs: OwnerQueryArgs, userId: string) {
  const { data: tagsResponse } = useGetTagsQuery(ownerQueryArgs);
  const [createTagRequest] = useCreateTagMutation();

  const tags = useMemo(
    () => (tagsResponse?.data ?? []).map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
    [tagsResponse]
  );

  const createTag = useCallback(
    async (name: string, color?: string) => {
      try {
        const { data: createdTag } = await createTagRequest({ name, color, user_id: userId }).unwrap();
        toast.success(`Tag "${name}" created`);
        return createdTag;
      } catch {
        toast.error("Could not create tag");
        return null;
      }
    },
    [createTagRequest, userId]
  );

  return { tags, createTag };
}
