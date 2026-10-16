import type { PrismaClient, Workflow } from "@prisma/client";
import prisma from "../../../lib/prisma.js";

export interface CreateWorkflowInput {
  name: string;
  tag: string | null;
  user_id: string;
  status: string;
  folder_id: string | null;
  position?: number;
}

export interface UpdateWorkflowInput {
  name?: string;
  tag?: string;
  status?: string;
  folder_id?: string | null;
  position?: number;
  last_edited_by_user_id?: string;
  last_edited_by_name?: string;
  last_edited_at?: Date;
}

export interface WorkflowPlacement {
  id: string;
  folder_id: string | null;
  position: number;
}

export interface ProfileName {
  id: string;
  full_name: string;
}

/**
 * Repository — the only place that talks to the database for workflows.
 * A workflow's polling subscriptions follow its status, so they are part of this aggregate.
 */
export class WorkflowRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  create(input: CreateWorkflowInput): Promise<Workflow> {
    return this.database.workflow.create({ data: input });
  }

  findById(workflowId: string): Promise<Workflow | null> {
    return this.database.workflow.findUnique({ where: { id: workflowId } });
  }

  findByOwner(userId: string): Promise<Workflow[]> {
    return this.database.workflow.findMany({
      where: { user_id: userId },
      orderBy: [{ position: "asc" }, { created_at: "desc" }],
    });
  }

  findProfileNames(profileIds: string[]): Promise<ProfileName[]> {
    return this.database.profile.findMany({
      where: { id: { in: profileIds } },
      select: { id: true, full_name: true },
    });
  }

  findProfileName(profileId: string): Promise<ProfileName | null> {
    return this.database.profile.findUnique({
      where: { id: profileId },
      select: { id: true, full_name: true },
    });
  }

  update(workflowId: string, input: UpdateWorkflowInput): Promise<Workflow> {
    return this.database.workflow.update({ where: { id: workflowId }, data: input });
  }

  /**
   * Updates the workflow and switches its polling subscriptions on or off in one transaction.
   * Activating also resets the poll timestamp and error state so the next tick fires immediately.
   */
  updateWithPollingState(
    workflowId: string,
    input: UpdateWorkflowInput,
    shouldPoll: boolean
  ): Promise<Workflow> {
    const pollingState = shouldPoll
      ? { is_active: true, last_polled_at: null, error_count: 0, last_error: null }
      : { is_active: false };

    return this.database.$transaction(async (transaction) => {
      const workflow = await transaction.workflow.update({ where: { id: workflowId }, data: input });
      await transaction.pollingSubscription.updateMany({
        where: { workflow_id: workflowId },
        data: pollingState,
      });
      return workflow;
    });
  }

  async delete(workflowId: string): Promise<void> {
    await this.database.workflow.delete({ where: { id: workflowId } });
  }

  async moveToFolder(workflowIds: string[], folderId: string | null): Promise<void> {
    await this.database.workflow.updateMany({
      where: { id: { in: workflowIds } },
      data: { folder_id: folderId },
    });
  }

  async reorder(placements: WorkflowPlacement[]): Promise<void> {
    await this.database.$transaction(
      placements.map((placement) =>
        this.database.workflow.update({
          where: { id: placement.id },
          data: { folder_id: placement.folder_id, position: placement.position },
        })
      )
    );
  }
}

export const workflowRepository = new WorkflowRepository();
