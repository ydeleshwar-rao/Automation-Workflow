import type { PrismaClient } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

/** What the template wizard needs to know about a user's stored integration credentials. */
export interface IntegrationConnection {
  needs_reauth: boolean;
}

type ConnectionLookup = (database: PrismaClient, userId: string) => Promise<IntegrationConnection | null>;

/**
 * Registry of integration_key (as used in workflow_template_nodes) → credential lookup.
 * A new integration is supported by adding one entry here (Open/Closed).
 */
const CONNECTION_LOOKUPS: Record<string, ConnectionLookup> = {
  service_m8: (database, userId) =>
    database.servicem8Integration.findUnique({ where: { user_id: userId }, select: { needs_reauth: true } }),
  commusoft: (database, userId) =>
    database.commusoftIntegration.findUnique({ where: { user_id: userId }, select: { needs_reauth: true } }),
  simpro: (database, userId) =>
    database.simproIntegration.findUnique({ where: { user_id: userId }, select: { needs_reauth: true } }),
  // leadshub_integrations has no needs_reauth column; a stored row means connected.
  leadshub: async (database, userId) => {
    const integration = await database.leadshubIntegration.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });
    return integration ? { needs_reauth: false } : null;
  },
};

/** Repository — reads integration credential rows only to report whether a user is connected. */
export class IntegrationConnectionRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  supportedIntegrationKeys(): string[] {
    return Object.keys(CONNECTION_LOOKUPS);
  }

  isSupported(integrationKey: string): boolean {
    return integrationKey in CONNECTION_LOOKUPS;
  }

  /** null when the user has no stored credentials for the integration (or it is unknown). */
  findConnection(integrationKey: string, userId: string): Promise<IntegrationConnection | null> {
    const lookup = CONNECTION_LOOKUPS[integrationKey];
    return lookup ? lookup(this.database, userId) : Promise.resolve(null);
  }
}

export const integrationConnectionRepository = new IntegrationConnectionRepository();
