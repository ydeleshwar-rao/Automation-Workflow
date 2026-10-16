import type { PagePermission, PrismaClient, Profile } from "@prisma/client";
import prisma from "../../lib/prisma.js";

const ADMIN_ROLE = "admin";
const DEVELOPER_ROLE = "developer";

export type MemberProfile = Pick<
  Profile,
  "id" | "email" | "full_name" | "avatar_url" | "role" | "organization_id" | "is_active" | "created_at" | "updated_at"
>;

export type ProfileStatus = Pick<Profile, "id" | "email" | "full_name" | "is_active" | "role" | "organization_id">;

export type PermissionRecord = Pick<
  PagePermission,
  "id" | "page_key" | "can_view" | "can_edit" | "can_delete" | "updated_at"
>;

export type MemberWithPermissions = MemberProfile & { pagePermissions: PermissionRecord[] };

export type ProfileMembership = Pick<Profile, "id" | "role" | "organization_id">;

export interface PermissionGrantInput {
  page_key: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface PermissionChanges {
  can_view?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

const MEMBER_PROFILE_SELECT = {
  id: true,
  email: true,
  full_name: true,
  avatar_url: true,
  role: true,
  organization_id: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} as const;

const PERMISSION_SELECT = {
  id: true,
  page_key: true,
  can_view: true,
  can_edit: true,
  can_delete: true,
  updated_at: true,
} as const;

const MEMBER_WITH_PERMISSIONS_SELECT = {
  ...MEMBER_PROFILE_SELECT,
  pagePermissions: { select: PERMISSION_SELECT, orderBy: { page_key: "asc" } },
} as const;

/** Repository for workspace members (profiles) and their page permissions. */
export class AccessRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  findMembership(userId: string): Promise<ProfileMembership | null> {
    return this.database.profile.findUnique({
      where: { id: userId },
      select: { id: true, role: true, organization_id: true },
    });
  }

  findWithPermissions(userId: string): Promise<MemberWithPermissions | null> {
    return this.database.profile.findUnique({ where: { id: userId }, select: MEMBER_WITH_PERMISSIONS_SELECT });
  }

  findDevelopersWithPermissions(organizationId: string): Promise<MemberWithPermissions[]> {
    return this.database.profile.findMany({
      where: { role: DEVELOPER_ROLE, organization_id: organizationId },
      orderBy: { created_at: "desc" },
      select: MEMBER_WITH_PERMISSIONS_SELECT,
    });
  }

  findAdmins(organizationId: string): Promise<MemberProfile[]> {
    return this.database.profile.findMany({
      where: { role: ADMIN_ROLE, organization_id: organizationId },
      orderBy: { created_at: "asc" },
      select: MEMBER_PROFILE_SELECT,
    });
  }

  countAdmins(organizationId: string): Promise<number> {
    return this.database.profile.count({ where: { role: ADMIN_ROLE, organization_id: organizationId } });
  }

  updateActiveStatus(userId: string, isActive: boolean): Promise<ProfileStatus> {
    return this.database.profile.update({
      where: { id: userId },
      data: { is_active: isActive },
      select: { id: true, email: true, full_name: true, is_active: true, role: true, organization_id: true },
    });
  }

  // ── Page permissions ──

  findPermissions(userId: string): Promise<PermissionRecord[]> {
    return this.database.pagePermission.findMany({
      where: { user_id: userId },
      orderBy: { page_key: "asc" },
      select: PERMISSION_SELECT,
    });
  }

  async hasPermission(userId: string, pageKey: string): Promise<boolean> {
    const permission = await this.database.pagePermission.findUnique({
      where: { user_id_page_key: { user_id: userId, page_key: pageKey } },
      select: { id: true },
    });
    return permission !== null;
  }

  /** Replaces every permission of the user atomically. */
  async replacePermissions(userId: string, grants: PermissionGrantInput[], grantedBy: string): Promise<void> {
    await this.database.$transaction([
      this.database.pagePermission.deleteMany({ where: { user_id: userId } }),
      this.database.pagePermission.createMany({
        data: grants.map((grant) => ({ ...grant, user_id: userId, granted_by: grantedBy })),
      }),
    ]);
  }

  upsertPermission(
    userId: string,
    pageKey: string,
    changes: PermissionChanges,
    grantedBy: string,
  ): Promise<PermissionRecord> {
    return this.database.pagePermission.upsert({
      where: { user_id_page_key: { user_id: userId, page_key: pageKey } },
      create: { ...changes, user_id: userId, page_key: pageKey, granted_by: grantedBy },
      update: { ...changes, granted_by: grantedBy },
      select: PERMISSION_SELECT,
    });
  }

  async deletePermission(userId: string, pageKey: string): Promise<void> {
    await this.database.pagePermission.deleteMany({ where: { user_id: userId, page_key: pageKey } });
  }
}

export const accessRepository = new AccessRepository();
