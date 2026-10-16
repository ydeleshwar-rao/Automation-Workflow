import type { Prisma, PrismaClient, WorkflowFieldMapping } from "@prisma/client";
import prisma from "../../../lib/prisma.js";

/** Repository — the only place that talks to the database for node field mappings (one row per node). */
export class WorkflowFieldMappingRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  findByNode(nodeId: string): Promise<WorkflowFieldMapping | null> {
    return this.database.workflowFieldMapping.findUnique({ where: { workflow_node_id: nodeId } });
  }

  /** Replaces all mappings of a node, creating the row on first save. */
  saveForNode(nodeId: string, mappings: Prisma.InputJsonValue): Promise<WorkflowFieldMapping> {
    return this.database.workflowFieldMapping.upsert({
      where: { workflow_node_id: nodeId },
      create: { workflow_node_id: nodeId, mappings },
      update: { mappings },
    });
  }
}

export const workflowFieldMappingRepository = new WorkflowFieldMappingRepository();
