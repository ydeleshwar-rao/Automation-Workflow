import type { Prisma, PrismaClient, WorkflowExecution } from "@prisma/client";
import prisma from "../../../lib/prisma.js";

export interface CreateExecutionLogInput {
  execution_id: string;
  workflow_id: string;
  node_id: string;
  node_position: number | null;
  integration_key: string | null;
  action_key: string | null;
  log_level: string;
  resolved_value: string | null;
  status: string;
  error_message: string | null;
}

/** Repository — the only place that talks to the database for workflow executions and their logs. */
export class WorkflowExecutionRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  start(workflowId: string, triggerPayload: Prisma.InputJsonValue): Promise<WorkflowExecution> {
    return this.database.workflowExecution.create({
      data: {
        workflow_id: workflowId,
        status: "running",
        trigger_payload: triggerPayload,
        started_at: new Date(),
      },
    });
  }

  async finish(executionId: string, status: "completed" | "failed"): Promise<void> {
    await this.database.workflowExecution.update({
      where: { id: executionId },
      data: { status, finished_at: new Date() },
    });
  }

  findByWorkflow(workflowId: string): Promise<WorkflowExecution[]> {
    return this.database.workflowExecution.findMany({
      where: { workflow_id: workflowId },
      orderBy: { started_at: "desc" },
    });
  }

  findById(executionId: string): Promise<WorkflowExecution | null> {
    return this.database.workflowExecution.findUnique({ where: { id: executionId } });
  }

  async addLogs(logRows: CreateExecutionLogInput[]): Promise<void> {
    await this.database.workflowExecutionLog.createMany({ data: logRows });
  }
}

export const workflowExecutionRepository = new WorkflowExecutionRepository();
