import type { CommusoftIntegration, PrismaClient } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface SaveCommusoftCredentialsInput {
  user_id: string;
  access_token: string;
  client_id: string;
  application_id: string;
  username: string;
  password: string;
}

export interface CommusoftOwnerProfile {
  full_name: string;
  email: string;
  organization: { name: string };
}

/**
 * Repository — the only place that talks to the database for Commusoft.
 * Only the connection credentials are stored; Commusoft data is always fetched live.
 */
export class CommusoftIntegrationRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  findByUserId(userId: string): Promise<CommusoftIntegration | null> {
    return this.database.commusoftIntegration.findUnique({ where: { user_id: userId } });
  }

  saveCredentials(input: SaveCommusoftCredentialsInput): Promise<CommusoftIntegration> {
    const { user_id: userId, ...credentials } = input;
    return this.database.commusoftIntegration.upsert({
      where: { user_id: userId },
      create: input,
      update: { ...credentials, needs_reauth: false },
    });
  }

  /** Returns how many rows were removed (0 when the user was not connected). */
  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.database.commusoftIntegration.deleteMany({
      where: { user_id: userId },
    });
    return result.count;
  }

  findOwnerProfile(userId: string): Promise<CommusoftOwnerProfile | null> {
    return this.database.profile.findUnique({
      where: { id: userId },
      select: { full_name: true, email: true, organization: { select: { name: true } } },
    });
  }
}

export const commusoftIntegrationRepository = new CommusoftIntegrationRepository();
