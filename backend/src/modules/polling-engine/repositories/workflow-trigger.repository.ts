import type { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../../../lib/prisma.js";

const ACTIVE_WORKFLOW_STATUS = "active";

/**
 * Repository — workflow / trigger-node reads and writes shared by the polling
 * and webhook engines (workflow status check, Test-step sample persistence).
 */
export class WorkflowTriggerRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  /** Returns null when the workflow no longer exists. */
  async findWorkflowStatus(workflowId: string): Promise<string | null> {
    const workflow = await this.database.workflow.findUnique({
      where: { id: workflowId },
      select: { status: true },
    });
    return workflow?.status ?? null;
  }

  async isWorkflowActive(workflowId: string): Promise<boolean> {
    return (await this.findWorkflowStatus(workflowId)) === ACTIVE_WORKFLOW_STATUS;
  }

  async saveNodeSample(
    nodeId: string,
    samplePayload: Prisma.InputJsonValue,
    outputSchema: Prisma.InputJsonValue
  ): Promise<void> {
    await this.database.workflowNode.update({
      where: { id: nodeId },
      data: { sample_payload: samplePayload, output_schema: outputSchema },
    });
  }
}

export const workflowTriggerRepository = new WorkflowTriggerRepository();
