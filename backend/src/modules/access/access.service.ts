import crypto        from "crypto";
import { ApiError }  from "../../utils/ApiError.js";
import { hashPassword } from "../auth/security/password-hasher.js";
import { authUserRepository } from "../auth/repositories/auth-user.repository.js";
import {
  accessRepository,
  type MemberProfile,
  type PermissionChanges,
  type PermissionRecord,
  type ProfileStatus,
} from "./access.repository.js";

const TEMP_PASSWORD_BYTES = 12;
const EMAIL_PROVIDER = "email";

export interface PagePermissionInput {
  page_key:   string;
  can_view:   boolean;
  can_edit?:  boolean;
  can_delete?: boolean;
}

type MappableProfile = ProfileStatus & Partial<Pick<MemberProfile, "avatar_url" | "created_at" | "updated_at">>;

function mapProfile(row: MappableProfile, pagePermissions: PermissionRecord[] = []) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? "",
    avatarUrl: row.avatar_url,
    role: row.role,
    organizationId: row.organization_id,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pagePermissions: pagePermissions.map(mapPermission),
  };
}

function mapPermission(row: PermissionRecord) {
  return {
    id: row.id,
    pageKey: row.page_key,
    canView: row.can_view ?? false,
    canEdit: row.can_edit ?? false,
    canDelete: row.can_delete ?? false,
    updatedAt: row.updated_at,
  };
}

function toPermissionGrant(permission: PagePermissionInput) {
  return {
    page_key: permission.page_key,
    can_view: permission.can_view,
    can_edit: permission.can_edit ?? false,
    can_delete: permission.can_delete ?? false,
  };
}

export class AccessService {
  private static async assertUserInOrganization(userId: string, organizationId: string) {
    const membership = await accessRepository.findMembership(userId);
    if (!membership || membership.organization_id !== organizationId) {
      throw new ApiError(404, "User not found");
    }
  }

  private static async getProfileWithPermissions(userId: string) {
    const profile = await accessRepository.findWithPermissions(userId);
    return profile ? mapProfile(profile, profile.pagePermissions) : null;
  }

  /** Creates login account + profile + page permissions in one transaction. */
  static async createDeveloper(payload: {
    email:       string;
    fullName:    string;
    createdById: string;
    organizationId: string;
    permissions: PagePermissionInput[];
    password?:   string;
  }) {
    const password = payload.password ?? crypto.randomBytes(TEMP_PASSWORD_BYTES).toString("base64url");
    if (await authUserRepository.findIdByEmail(payload.email)) {
      throw new ApiError(409, "A user with this email already exists");
    }

    const { userId } = await authUserRepository.createAccount({
      user: {
        email: payload.email,
        provider: EMAIL_PROVIDER,
        password_hash: await hashPassword(password),
        user_metadata: { full_name: payload.fullName, role: "developer", organization_id: payload.organizationId },
      },
      organization: { existingOrganizationId: payload.organizationId },
      profile: { full_name: payload.fullName, avatar_url: null, role: "developer", created_by: payload.createdById },
      pagePermissions: payload.permissions.map((permission) => ({
        ...toPermissionGrant(permission),
        granted_by: payload.createdById,
      })),
    });

    const profile = await AccessService.getProfileWithPermissions(userId);
    return { profile, temp_password: password };
  }

  static async listDevelopers(callerRole: string, callerId: string, organizationId: string) {
    if (callerRole !== "admin") {
      const self = await AccessService.getProfileWithPermissions(callerId);
      return self ? [self] : [];
    }

    const developers = await accessRepository.findDevelopersWithPermissions(organizationId);
    return developers.map((developer) => mapProfile(developer, developer.pagePermissions));
  }

  static async getDeveloper(developerId: string, organizationId?: string) {
    const profile = await AccessService.getProfileWithPermissions(developerId);
    if (!profile || profile.role !== "developer") throw new ApiError(404, "Developer not found");
    if (organizationId && profile.organizationId !== organizationId) throw new ApiError(404, "Developer not found");
    return profile;
  }

  static async toggleDeveloperStatus(developerId: string, isActive: boolean, organizationId?: string) {
    if (organizationId) await AccessService.assertUserInOrganization(developerId, organizationId);

    const membership = await accessRepository.findMembership(developerId);
    if (!membership) throw new ApiError(404, "Developer not found");
    if (membership.role !== "developer") throw new ApiError(400, "Target user is not a developer");

    const updatedProfile = await accessRepository.updateActiveStatus(developerId, isActive);
    return mapProfile(updatedProfile);
  }

  static async deleteDeveloper(developerId: string, organizationId?: string) {
    const profile = await AccessService.getDeveloper(developerId, organizationId);
    if (profile.role !== "developer") throw new ApiError(400, "Can only delete developer accounts");

    await authUserRepository.delete(developerId);
    return { message: "Developer deleted successfully" };
  }

  static async listAdmins(organizationId: string) {
    const admins = await accessRepository.findAdmins(organizationId);
    return admins.map((admin) => mapProfile(admin));
  }

  static async deleteAdmin(adminId: string, callerId: string, organizationId: string) {
    if (adminId === callerId) throw new ApiError(400, "You cannot delete your own account while logged in");

    const membership = await accessRepository.findMembership(adminId);
    if (!membership || membership.organization_id !== organizationId) throw new ApiError(404, "Admin account not found");
    if (membership.role !== "admin") throw new ApiError(400, "Target account is not an admin");

    const adminCount = await accessRepository.countAdmins(organizationId);
    if (adminCount <= 1) throw new ApiError(400, "Cannot delete the last admin account — add another admin first");

    await authUserRepository.delete(adminId);
    return { message: "Admin account deleted successfully" };
  }

  static async setPagePermissions(
    userId: string,
    permissions: PagePermissionInput[],
    grantedBy: string,
    organizationId?: string
  ) {
    if (organizationId) await AccessService.assertUserInOrganization(userId, organizationId);

    await accessRepository.replacePermissions(userId, permissions.map(toPermissionGrant), grantedBy);
    if (permissions.length === 0) return [];

    return AccessService.getPagePermissions(userId, organizationId);
  }

  static async upsertPagePermission(
    userId: string,
    pageKey: string,
    data: { canView?: boolean; canEdit?: boolean; canDelete?: boolean },
    grantedBy: string,
    organizationId?: string
  ) {
    if (organizationId) await AccessService.assertUserInOrganization(userId, organizationId);

    const changes: PermissionChanges = {
      ...(data.canView !== undefined ? { can_view: data.canView } : {}),
      ...(data.canEdit !== undefined ? { can_edit: data.canEdit } : {}),
      ...(data.canDelete !== undefined ? { can_delete: data.canDelete } : {}),
    };
    const permission = await accessRepository.upsertPermission(userId, pageKey, changes, grantedBy);
    return mapPermission(permission);
  }

  static async getPagePermissions(userId: string, organizationId?: string) {
    if (organizationId) await AccessService.assertUserInOrganization(userId, organizationId);

    const permissions = await accessRepository.findPermissions(userId);
    return permissions.map(mapPermission);
  }

  static async removePagePermission(userId: string, pageKey: string, organizationId?: string) {
    if (organizationId) await AccessService.assertUserInOrganization(userId, organizationId);

    if (!(await accessRepository.hasPermission(userId, pageKey))) {
      throw new ApiError(404, `Permission '${pageKey}' not found for this user`);
    }

    await accessRepository.deletePermission(userId, pageKey);
    return { message: "Permission removed" };
  }
}
