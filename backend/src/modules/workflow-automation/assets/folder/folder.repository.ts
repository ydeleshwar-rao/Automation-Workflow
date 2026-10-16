import type { PrismaClient, WorkflowFolder } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface CreateWorkflowFolderInput {
  name: string;
  user_id: string;
  parent_id: string | null;
  position?: number;
}

export interface UpdateWorkflowFolderInput {
  name?: string;
  parent_id?: string | null;
  position?: number;
}

export interface WorkflowFolderPlacement {
  id: string;
  parent_id: string | null;
  position: number;
}

/** Repository — the only place that talks to the database for workflow folders. */
export class WorkflowFolderRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  create(input: CreateWorkflowFolderInput): Promise<WorkflowFolder> {
    return this.database.workflowFolder.create({ data: input });
  }

  /** Pass ownerUserId to limit the list to one user. */
  findMany(ownerUserId?: string): Promise<WorkflowFolder[]> {
    return this.database.workflowFolder.findMany({
      where: ownerUserId ? { user_id: ownerUserId } : {},
      orderBy: [{ position: "asc" }, { created_at: "desc" }],
    });
  }

  async findChildIds(parentId: string): Promise<string[]> {
    const children = await this.database.workflowFolder.findMany({
      where: { parent_id: parentId },
      select: { id: true },
    });
    return children.map((child) => child.id);
  }

  update(folderId: string, input: UpdateWorkflowFolderInput): Promise<WorkflowFolder> {
    return this.database.workflowFolder.update({ where: { id: folderId }, data: input });
  }

  async delete(folderId: string): Promise<void> {
    await this.database.workflowFolder.delete({ where: { id: folderId } });
  }

  async reorder(placements: WorkflowFolderPlacement[]): Promise<void> {
    await this.database.$transaction(
      placements.map((placement) =>
        this.database.workflowFolder.update({
          where: { id: placement.id },
          data: { parent_id: placement.parent_id, position: placement.position },
        })
      )
    );
  }
}

export const workflowFolderRepository = new WorkflowFolderRepository();
