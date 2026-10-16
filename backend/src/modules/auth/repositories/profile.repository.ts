import type { PagePermission, PrismaClient, Profile } from "@prisma/client";
import prisma from "../../../lib/prisma.js";

const ADMIN_ROLE = "admin";

export type SessionProfile = Pick<
  Profile,
  "id" | "email" | "full_name" | "role" | "organization_id" | "is_active" | "avatar_url"
>;

export type ProfileWithPermissions = SessionProfile &
  Pick<Profile, "created_at" | "updated_at"> & {
    pagePermissions: Pick<PagePermission, "page_key" | "can_view" | "can_edit" | "can_delete">[];
  };

export interface SignInProfileUpdate {
  email: string;
  full_name: string;
  avatar_url: string | null;
}

const SESSION_PROFILE_SELECT = {
  id: true,
  email: true,
  full_name: true,
  role: true,
  organization_id: true,
  is_active: true,
  avatar_url: true,
} as const;

/** Read side of profiles + page permissions needed to build a signed-in session. */
export class ProfileRepository {
  constructor(private readonly database: PrismaClient = prisma) {}

  findSessionProfile(userId: string): Promise<SessionProfile | null> {
    return this.database.profile.findUnique({ where: { id: userId }, select: SESSION_PROFILE_SELECT });
  }

  findWithPermissions(userId: string): Promise<ProfileWithPermissions | null> {
    return this.database.profile.findUnique({
      where: { id: userId },
      select: {
        ...SESSION_PROFILE_SELECT,
        created_at: true,
        updated_at: true,
        pagePermissions: { select: { page_key: true, can_view: true, can_edit: true, can_delete: true } },
      },
    });
  }

  async findViewablePageKeys(userId: string): Promise<string[]> {
    const permissions = await this.database.pagePermission.findMany({
      where: { user_id: userId, can_view: true },
      select: { page_key: true },
    });
    return permissions.map((permission) => permission.page_key);
  }

  async hasAnyAdmin(): Promise<boolean> {
    const adminCount = await this.database.profile.count({ where: { role: ADMIN_ROLE } });
    return adminCount > 0;
  }

  /**
   * Signing in again with Google refreshes the profile details.
   * It must never re-activate a profile — only an admin may do that.
   */
  async updateFromSignIn(userId: string, update: SignInProfileUpdate): Promise<void> {
    await this.database.profile.update({ where: { id: userId }, data: update });
  }
}

export const profileRepository = new ProfileRepository();
