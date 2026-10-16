import type { AiWorkflow, AiWorkflowExecution, Prisma, PrismaClient } from "@prisma/client";
import prisma from "../../lib/prisma.js";

const EXECUTION_HISTORY_LIMIT = 50;

export interface CreateAiWorkflowInput {
  user_id: string;
  name: string;
  description: string | null;
  status: string;
}

export interface UpdateAiWorkflowInput {
  name?: string;
  description?: string;
  status?: string;
  nodes?: Prisma.InputJsonValue;
  edges?: Prisma.InputJsonValue;
  viewport?: Prisma.InputJsonValue;
}

export interface UpdateAiExecutionInput {
  status?: string;
  node_results?: Prisma.InputJsonValue;
  error?: string;
  finished_at?: Date;
}

export type AiWorkflowSummary = Pick<AiWorkflow, "id" | "name" | "description" | "status" | "created_at" | "updated_at">;

/** Repository — the only place that talks to the database for AI workflows and their executions. */
export class AiWorkflowRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  create(input: CreateAiWorkflowInput): Promise<AiWorkflow> {
    return this.database.aiWorkflow.create({ data: { ...input, nodes: [], edges: [] } });
  }

  findSummariesByOwner(userId: string): Promise<AiWorkflowSummary[]> {
    return this.database.aiWorkflow.findMany({
      where: { user_id: userId },
      select: { id: true, name: true, description: true, status: true, created_at: true, updated_at: true },
      orderBy: { updated_at: "desc" },
    });
  }

  findById(workflowId: string): Promise<AiWorkflow | null> {
    return this.database.aiWorkflow.findUnique({ where: { id: workflowId } });
  }

  update(workflowId: string, input: UpdateAiWorkflowInput): Promise<AiWorkflow> {
    return this.database.aiWorkflow.update({ where: { id: workflowId }, data: input });
  }

  /** Executions are removed by ON DELETE CASCADE. */
  async delete(workflowId: string): Promise<void> {
    await this.database.aiWorkflow.delete({ where: { id: workflowId } });
  }

  createExecution(workflowId: string, trigger: string): Promise<AiWorkflowExecution> {
    return this.database.aiWorkflowExecution.create({
      data: { workflow_id: workflowId, trigger, status: "pending" },
    });
  }

  findRecentExecutions(workflowId: string): Promise<AiWorkflowExecution[]> {
    return this.database.aiWorkflowExecution.findMany({
      where: { workflow_id: workflowId },
      orderBy: { started_at: "desc" },
      take: EXECUTION_HISTORY_LIMIT,
    });
  }

  updateExecution(executionId: string, input: UpdateAiExecutionInput): Promise<AiWorkflowExecution> {
    return this.database.aiWorkflowExecution.update({ where: { id: executionId }, data: input });
  }
}

export const aiWorkflowRepository = new AiWorkflowRepository();
