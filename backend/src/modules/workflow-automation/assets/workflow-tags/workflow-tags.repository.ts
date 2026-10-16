import type { PrismaClient, WorkflowTag, WorkflowTagLink, Workflow } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface CreateWorkflowTagInput {
  name: string;
  color: string | null;
  user_id: string;
}

export interface UpdateWorkflowTagInput {
  name?: string;
  color?: string;
}

export type TagLinkWithTag = Pick<WorkflowTagLink, "tag_id"> & { tag: WorkflowTag };
export type TagLinkWithWorkflow = Pick<WorkflowTagLink, "workflow_id"> & { workflow: Workflow };

/**
 * Repository — the only place that talks to the database for workflow tags.
 * The Prisma client is injected so tests can pass a fake (Dependency Inversion).
 */
export class WorkflowTagRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  create(input: CreateWorkflowTagInput): Promise<WorkflowTag> {
    return this.database.workflowTag.create({ data: input });
  }

  /** All tags, newest first. Pass ownerUserId to limit the list to one user. */
  findMany(ownerUserId?: string): Promise<WorkflowTag[]> {
    return this.database.workflowTag.findMany({
      where: ownerUserId ? { user_id: ownerUserId } : {},
      orderBy: { created_at: "desc" },
    });
  }

  update(tagId: string, input: UpdateWorkflowTagInput): Promise<WorkflowTag> {
    return this.database.workflowTag.update({ where: { id: tagId }, data: input });
  }

  /** Tag links are removed by ON DELETE CASCADE. */
  async delete(tagId: string): Promise<void> {
    await this.database.workflowTag.delete({ where: { id: tagId } });
  }

  linkToWorkflow(workflowId: string, tagId: string): Promise<WorkflowTagLink> {
    return this.database.workflowTagLink.create({
      data: { workflow_id: workflowId, tag_id: tagId },
    });
  }

  async unlinkFromWorkflow(workflowId: string, tagId: string): Promise<void> {
    await this.database.workflowTagLink.deleteMany({
      where: { workflow_id: workflowId, tag_id: tagId },
    });
  }

  findTagsForWorkflow(workflowId: string): Promise<TagLinkWithTag[]> {
    return this.database.workflowTagLink.findMany({
      where: { workflow_id: workflowId },
      select: { tag_id: true, tag: true },
    });
  }

  findWorkflowsForTag(tagId: string): Promise<TagLinkWithWorkflow[]> {
    return this.database.workflowTagLink.findMany({
      where: { tag_id: tagId },
      select: { workflow_id: true, workflow: true },
    });
  }
}

export const workflowTagRepository = new WorkflowTagRepository();
