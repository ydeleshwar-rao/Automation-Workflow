import type { PrismaClient, WorkflowTag, WorkflowTagLink, Workflow } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface CreateWorkflowTagInput {
  organization_id: string;
  user_id: string;
  name: string;
  color: string | null;
}

export interface UpdateWorkflowTagInput {
  name?: string;
  color?: string | null;
}

export type TagLinkWithTag = Pick<WorkflowTagLink, "tag_id"> & { tag: WorkflowTag };
export type TagLinkWithWorkflow = Pick<WorkflowTagLink, "workflow_id"> & { workflow: Workflow };

/**
 * Repository — the only place that talks to the database for workflow tags and the
 * organization's tag switch. Tags are shared per organization.
 * The Prisma client is injected so tests can pass a fake (Dependency Inversion).
 */
export class WorkflowTagRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  create(input: CreateWorkflowTagInput): Promise<WorkflowTag> {
    return this.database.workflowTag.create({ data: input });
  }

  /** The organization's tags, alphabetically. */
  findManyForOrganization(organizationId: string): Promise<WorkflowTag[]> {
    return this.database.workflowTag.findMany({
      where: { organization_id: organizationId },
      orderBy: { name: "asc" },
    });
  }

  findInOrganization(tagId: string, organizationId: string): Promise<WorkflowTag | null> {
    return this.database.workflowTag.findFirst({ where: { id: tagId, organization_id: organizationId } });
  }

  findByNameInOrganization(name: string, organizationId: string): Promise<WorkflowTag | null> {
    return this.database.workflowTag.findFirst({
      where: { organization_id: organizationId, name: { equals: name, mode: "insensitive" } },
    });
  }

  update(tagId: string, input: UpdateWorkflowTagInput): Promise<WorkflowTag> {
    return this.database.workflowTag.update({ where: { id: tagId }, data: input });
  }

  /** Tag links are removed by ON DELETE CASCADE. */
  async delete(tagId: string): Promise<void> {
    await this.database.workflowTag.delete({ where: { id: tagId } });
  }

  async isTaggingEnabled(organizationId: string): Promise<boolean> {
    const organization = await this.database.organization.findUnique({
      where: { id: organizationId },
      select: { workflow_tags_enabled: true },
    });
    return organization?.workflow_tags_enabled ?? false;
  }

  async setTaggingEnabled(organizationId: string, isEnabled: boolean): Promise<boolean> {
    const organization = await this.database.organization.update({
      where: { id: organizationId },
      data: { workflow_tags_enabled: isEnabled },
      select: { workflow_tags_enabled: true },
    });
    return organization.workflow_tags_enabled;
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
