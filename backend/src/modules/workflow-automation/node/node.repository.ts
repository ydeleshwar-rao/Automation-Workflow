import type { Prisma, PrismaClient, WorkflowNode } from "@prisma/client";
import prisma from "../../../lib/prisma.js";

const TRIGGER_NODE_TYPE = "trigger";
const WEBHOOK_INTEGRATION_KEY = "webhooks";

export interface CreateWorkflowNodeInput {
  workflow_id: string;
  integration_key: string;
  type: string;
  node_category: string;
  config: Prisma.InputJsonValue;
  sample_payload: Prisma.InputJsonValue;
  output_schema: Prisma.InputJsonValue;
  position: number;
  action_key: string;
}

export interface UpdateWorkflowNodeInput {
  integration_key?: string;
  node_category?: string;
  config?: Prisma.InputJsonValue;
  sample_payload?: Prisma.InputJsonValue;
  output_schema?: Prisma.InputJsonValue;
  position?: number;
  action_key?: string;
}

/** Repository — the only place that talks to the database for workflow nodes. */
export class WorkflowNodeRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  create(input: CreateWorkflowNodeInput): Promise<WorkflowNode> {
    return this.database.workflowNode.create({ data: input });
  }

  update(nodeId: string, input: UpdateWorkflowNodeInput): Promise<WorkflowNode> {
    return this.database.workflowNode.update({ where: { id: nodeId }, data: input });
  }

  findByWorkflow(workflowId: string): Promise<WorkflowNode[]> {
    return this.database.workflowNode.findMany({
      where: { workflow_id: workflowId },
      orderBy: { position: "asc" },
    });
  }

  /** The webhook trigger node whose config points at the given dynamic webhook. */
  findWebhookTriggerNode(webhookId: string): Promise<WorkflowNode | null> {
    return this.database.workflowNode.findFirst({
      where: {
        type: TRIGGER_NODE_TYPE,
        integration_key: WEBHOOK_INTEGRATION_KEY,
        config: { path: ["webhook_id"], equals: webhookId },
      },
    });
  }

  async delete(nodeId: string): Promise<void> {
    await this.database.workflowNode.delete({ where: { id: nodeId } });
  }
}

export const workflowNodeRepository = new WorkflowNodeRepository();
