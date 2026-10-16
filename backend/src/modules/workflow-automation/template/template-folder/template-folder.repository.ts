import type { PrismaClient, TemplateFolder } from "@prisma/client";
import prisma from "../../../../lib/prisma.js";

export interface CreateTemplateFolderInput {
  name: string;
  description: string | null;
  parent_id: string | null;
  created_by: string;
  is_public: boolean;
}

export interface UpdateTemplateFolderInput {
  name?: string;
  description?: string | null;
  parent_id?: string | null;
  is_public?: boolean;
}

/** Repository — the only place that talks to the database for template folders. */
export class TemplateFolderRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  create(input: CreateTemplateFolderInput): Promise<TemplateFolder> {
    return this.database.templateFolder.create({ data: input });
  }

  /** Pass createdBy to limit the list to one creator. */
  findMany(createdBy?: string): Promise<TemplateFolder[]> {
    return this.database.templateFolder.findMany({
      where: createdBy ? { created_by: createdBy } : {},
      orderBy: { created_at: "asc" },
    });
  }

  findById(folderId: string): Promise<TemplateFolder | null> {
    return this.database.templateFolder.findUnique({ where: { id: folderId } });
  }

  update(folderId: string, input: UpdateTemplateFolderInput): Promise<TemplateFolder> {
    return this.database.templateFolder.update({ where: { id: folderId }, data: input });
  }

  async delete(folderId: string): Promise<void> {
    await this.database.templateFolder.delete({ where: { id: folderId } });
  }

  async isClientAssignedToDeveloper(developerId: string, clientUserId: string): Promise<boolean> {
    const access = await this.database.userClientAccess.findUnique({
      where: { user_id_client_user_id: { user_id: developerId, client_user_id: clientUserId } },
      select: { id: true },
    });
    return access !== null;
  }
}

export const templateFolderRepository = new TemplateFolderRepository();
