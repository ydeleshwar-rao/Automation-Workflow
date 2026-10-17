import { useMemo } from "react";
import { useGetTagSettingsQuery, useGetTagsQuery } from "../apiIntegrations/folderTagApi";

/**
 * The organization's shared tags for the builder's filter and "new workflow" dialog.
 * Admins manage tags (and the on/off switch) on the Admin page; while tagging is off
 * this returns no tags so the tag UI stays hidden.
 */
export function useWorkflowTags() {
  const { data: settingsResponse } = useGetTagSettingsQuery();
  const isTagsEnabled = settingsResponse?.data?.enabled ?? false;
  const { data: tagsResponse } = useGetTagsQuery(undefined, { skip: !isTagsEnabled });

  const tags = useMemo(
    () =>
      isTagsEnabled ? (tagsResponse?.data ?? []).map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })) : [],
    [isTagsEnabled, tagsResponse]
  );

  return { tags, isTagsEnabled };
}
