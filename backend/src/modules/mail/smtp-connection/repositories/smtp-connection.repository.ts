import type { EmailLog, Prisma, PrismaClient, SmtpConnection } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface CreateSmtpConnectionInput {
  user_id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  encrypted_password: string;
  use_tls: boolean;
}

export interface CreateEmailLogInput {
  user_id: string;
  smtp_id: string;
  to_email: string;
  cc: string[];
  bcc: string[];
  attachments: Prisma.InputJsonValue;
  subject: string;
  status: "success" | "failed";
  error_message: string | null;
}

/** Columns that are safe to send to the client — never username or encrypted_password. */
const PUBLIC_SMTP_COLUMNS = {
  id: true,
  user_id: true,
  name: true,
  host: true,
  port: true,
  use_tls: true,
  status: true,
  total_sent: true,
  total_failed: true,
  created_at: true,
} satisfies Prisma.SmtpConnectionSelect;

export type PublicSmtpConnection = Prisma.SmtpConnectionGetPayload<{ select: typeof PUBLIC_SMTP_COLUMNS }>;

const ACTIVE_STATUS = "active";

/**
 * Repository — the only place that talks to the database for SMTP connections and their email logs.
 * The Prisma client is injected so tests can pass a fake (Dependency Inversion).
 */
export class SmtpConnectionRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  create(input: CreateSmtpConnectionInput): Promise<PublicSmtpConnection> {
    return this.database.smtpConnection.create({ data: input, select: PUBLIC_SMTP_COLUMNS });
  }

  findActiveById(smtpId: string): Promise<SmtpConnection | null> {
    return this.database.smtpConnection.findFirst({ where: { id: smtpId, status: ACTIVE_STATUS } });
  }

  findAllPublic(): Promise<PublicSmtpConnection[]> {
    return this.database.smtpConnection.findMany({ select: PUBLIC_SMTP_COLUMNS });
  }

  async incrementSentCount(smtpId: string): Promise<void> {
    await this.database.smtpConnection.update({
      where: { id: smtpId },
      data: { total_sent: { increment: 1 } },
    });
  }

  async incrementFailedCount(smtpId: string): Promise<void> {
    await this.database.smtpConnection.update({
      where: { id: smtpId },
      data: { total_failed: { increment: 1 } },
    });
  }

  async createEmailLog(input: CreateEmailLogInput): Promise<void> {
    await this.database.emailLog.create({ data: { ...input, attempt_count: 1 } });
  }

  findEmailLogsByUserId(userId: string): Promise<EmailLog[]> {
    return this.database.emailLog.findMany({ where: { user_id: userId } });
  }
}

export const smtpConnectionRepository = new SmtpConnectionRepository();
