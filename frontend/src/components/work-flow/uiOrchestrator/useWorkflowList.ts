import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  useCreateWorkflowMutation,
  useDeleteWorkflowMutation,
  useGetWorkflowsQuery,
  useUpdateWorkflowMutation,
  type WorkflowRecord,
} from "../apiIntegrations/workflowApi";
import { useAssignTagToWorkflowMutation } from "../apiIntegrations/folderTagApi";
import type { OwnerQueryArgs } from "./useCurrentUserScope";
import { indexToLetterLabel } from "./workflowNode.utils";

export interface WorkflowListItem {
  id: string;
  name: string;
  status: WorkflowRecord["status"];
  tagIds: string[];
}

interface UseWorkflowListOptions {
  ownerQueryArgs: OwnerQueryArgs;
  userId: string;
  selectedWorkflowId: string | null;
  selectWorkflow: (workflowId: string | null) => void;
}

/** The sidebar's workflow list and workflow-level create / rename / delete. */
export function useWorkflowList({ ownerQueryArgs, userId, selectedWorkflowId, selectWorkflow }: UseWorkflowListOptions) {
  const { data: workflowsResponse } = useGetWorkflowsQuery(ownerQueryArgs);
  const [createWorkflowRequest] = useCreateWorkflowMutation();
  const [updateWorkflowRequest] = useUpdateWorkflowMutation();
  const [deleteWorkflowRequest] = useDeleteWorkflowMutation();
  const [assignTagRequest] = useAssignTagToWorkflowMutation();

  const workflows = useMemo<WorkflowListItem[]>(
    () =>
      (workflowsResponse?.data ?? []).map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        tagIds: workflow.tag_ids ?? [],
      })),
    [workflowsResponse]
  );

  // Status comes straight from the cache (mutations patch it optimistically), so there is no second copy to sync
  const currentWorkflowStatus = workflows.find((workflow) => workflow.id === selectedWorkflowId)?.status ?? "draft";

  const createWorkflow = useCallback(
    async (requestedName?: string, tagIds: string[] = []) => {
      const name = requestedName?.trim() || `Workflow ${indexToLetterLabel(workflows.length)}`;
      try {
        const { data: createdWorkflow } = await createWorkflowRequest({ name, user_id: userId }).unwrap();
        await Promise.allSettled(
          tagIds.map((tagId) => assignTagRequest({ workflowId: createdWorkflow.id, tag_id: tagId }).unwrap())
        );
        selectWorkflow(createdWorkflow.id);
        toast.success(`"${createdWorkflow.name}" created`);
      } catch {
        toast.error("Workflow creation failed — backend unavailable");
      }
    },
    [workflows.length, userId, createWorkflowRequest, assignTagRequest, selectWorkflow]
  );

  const deleteWorkflow = useCallback(
    async (workflowId: string) => {
      try {
        await deleteWorkflowRequest(workflowId).unwrap();
        if (workflowId === selectedWorkflowId) selectWorkflow(null);
        toast.success("Workflow deleted");
      } catch {
        toast.error("Could not delete workflow — backend unavailable");
      }
    },
    [deleteWorkflowRequest, selectedWorkflowId, selectWorkflow]
  );

  const renameWorkflow = useCallback(
    async (workflowId: string, requestedName: string) => {
      const name = requestedName.trim();
      if (!name) return;
      try {
        await updateWorkflowRequest({ id: workflowId, patch: { name } }).unwrap();
      } catch {
        toast.error("Could not rename workflow");
      }
    },
    [updateWorkflowRequest]
  );

  return { workflows, currentWorkflowStatus, createWorkflow, deleteWorkflow, renameWorkflow };
}
