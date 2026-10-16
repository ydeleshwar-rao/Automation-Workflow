import type { Prisma }                          from "@prisma/client";
import { issueTokenPair, verifyRefreshToken }   from "../jwt.js";
import type { UserRole }                        from "../jwt.js";
import { ApiError }                             from "../../../utils/ApiError.js";
import { sendSystemMail }                       from "../../../utils/system-mail.js";
import { SsoService }                           from "../../sso/sso.service.js";
import { hashPassword, verifyPassword }         from "../security/password-hasher.js";
import { createResetToken, hashResetToken }     from "../security/reset-token.js";
import { verifyGoogleIdToken, type GoogleAccount } from "../security/google-id-token.js";
import { authUserRepository, type OrganizationType } from "../repositories/auth-user.repository.js";
import { profileRepository, type SessionProfile }    from "../repositories/profile.repository.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const DEFAULT_FRONTEND_URL = "http://localhost:3000";
const EMAIL_PROVIDER = "email";
const GOOGLE_PROVIDER = "google";
const DUPLICATE_EMAIL_MESSAGE = "An account with this email already exists";
const INVALID_CREDENTIALS_MESSAGE = "Invalid login credentials";

interface PasswordAccountInput {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  organizationType: OrganizationType;
}

export class AuthService {
  private static async getActiveProfile(userId: string): Promise<SessionProfile> {
    const profile = await profileRepository.findSessionProfile(userId);

    if (!profile) throw new ApiError(404, "Profile not found. Please contact an administrator.");
    if (profile.is_active === false) {
      throw new ApiError(403, "Your account has been deactivated. Contact an administrator.");
    }
    if (!profile.organization_id) {
      throw new ApiError(403, "Your account is not assigned to an organization.");
    }
    return profile;
  }

  /** Issues our JWT pair for a user (also used by company SSO sign-in). */
  static async issueAppSession(userId: string) {
    const profile = await this.getActiveProfile(userId);
    const permissions = profile.role === "developer"
      ? await profileRepository.findViewablePageKeys(userId)
      : [];

    const tokens = issueTokenPair({
      userId,
      email: profile.email,
      role: profile.role as UserRole,
      organizationId: profile.organization_id,
      permissions,
    });

    return {
      ...tokens,
      user: {
        id:          profile.id,
        email:       profile.email,
        full_name:   profile.full_name ?? "",
        role:        profile.role,
        organization_id: profile.organization_id,
        avatar_url:  profile.avatar_url,
        permissions: profile.role === "admin" ? ["*"] : permissions,
      },
    };
  }

  static async login(email: string, password: string) {
    const user = await authUserRepository.findByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new ApiError(401, INVALID_CREDENTIALS_MESSAGE);
    }

    await authUserRepository.markSignedIn(user.id);
    await SsoService.assertPasswordLoginAllowed(user.id);
    return this.issueAppSession(user.id);
  }

  /** Signs in with a Google ID token, creating the login account and a personal workspace when needed. */
  static async googleLogin(googleIdToken: string) {
    const googleAccount = await verifyGoogleIdToken(googleIdToken);
    const fullName = googleAccount.name || googleAccount.email.split("@")[0] || "";
    const userMetadata = { full_name: googleAccount.name, avatar_url: googleAccount.picture };
    const existingUser = await authUserRepository.findByEmail(googleAccount.email);

    if (!existingUser) {
      const { userId } = await authUserRepository.createAccount({
        user: { email: googleAccount.email, provider: GOOGLE_PROVIDER, user_metadata: userMetadata, last_sign_in_at: new Date() },
        organization: { name: `${fullName}'s Workspace`, type: "individual" },
        profile: { full_name: fullName, avatar_url: googleAccount.picture, role: "admin" },
      });
      return this.issueAppSession(userId);
    }

    const mergedMetadata = { ...this.readMetadata(existingUser.user_metadata), ...userMetadata };
    await authUserRepository.markSignedIn(existingUser.id, mergedMetadata);
    await this.syncGoogleProfile(existingUser, googleAccount, fullName);
    return this.issueAppSession(existingUser.id);
  }

  private static async syncGoogleProfile(
    user: { id: string; email: string },
    googleAccount: GoogleAccount,
    fullName: string,
  ) {
    const existingProfile = await profileRepository.findSessionProfile(user.id);
    if (existingProfile) {
      await profileRepository.updateFromSignIn(user.id, {
        email: googleAccount.email,
        full_name: fullName,
        avatar_url: googleAccount.picture,
      });
      return;
    }

    await authUserRepository.createWorkspaceForUser(
      user,
      { name: `${fullName}'s Workspace`, type: "individual" },
      { full_name: fullName, avatar_url: googleAccount.picture, role: "admin" },
    );
  }

  private static readMetadata(userMetadata: unknown): Prisma.InputJsonObject {
    return userMetadata && typeof userMetadata === "object" && !Array.isArray(userMetadata)
      ? (userMetadata as Prisma.InputJsonObject)
      : {};
  }

  static async isSetupRequired(): Promise<boolean> {
    return !(await profileRepository.hasAnyAdmin());
  }

  /** Creates login account + workspace + admin profile together (one transaction). */
  private static async createPasswordAccount(input: PasswordAccountInput) {
    if (await authUserRepository.findIdByEmail(input.email)) {
      throw new ApiError(409, DUPLICATE_EMAIL_MESSAGE);
    }

    return authUserRepository.createAccount({
      user: {
        email: input.email,
        provider: EMAIL_PROVIDER,
        password_hash: await hashPassword(input.password),
        user_metadata: { full_name: input.fullName, role: "admin" },
      },
      organization: { name: input.organizationName, type: input.organizationType },
      profile: { full_name: input.fullName, avatar_url: null, role: "admin" },
    });
  }

  static async setupAdmin(email: string, password: string, fullName: string, organizationName?: string) {
    await SsoService.assertEmailSignupAllowed(email);
    const { userId, organizationId } = await this.createPasswordAccount({
      email,
      password,
      fullName,
      organizationName: organizationName?.trim() || `${fullName}'s Organization`,
      organizationType: "company",
    });

    const tokens = issueTokenPair({ userId, email, role: "admin", organizationId, permissions: [] });
    return {
      ...tokens,
      user: {
        id:          userId,
        email,
        full_name:   fullName,
        role:        "admin",
        organization_id: organizationId,
        avatar_url:  null,
        permissions: ["*"],
      },
    };
  }

  static async register(email: string, password: string, fullName: string) {
    await SsoService.assertEmailSignupAllowed(email);
    const { userId, organizationId } = await this.createPasswordAccount({
      email,
      password,
      fullName,
      organizationName: `${fullName}'s Workspace`,
      organizationType: "individual",
    });

    return {
      user_id:   userId,
      email,
      full_name: fullName,
      organization_id: organizationId,
    };
  }

  /** Always succeeds so emails can't be enumerated. */
  static async requestPasswordReset(email: string) {
    const user = await authUserRepository.findByEmail(email);
    if (!user) return;

    const { token, tokenHash } = createResetToken();
    await authUserRepository.saveResetToken(user.id, tokenHash, new Date(Date.now() + RESET_TOKEN_TTL_MS));

    const frontendUrl = (process.env.FRONTEND_URL ?? DEFAULT_FRONTEND_URL).replace(/\/$/, "");
    const resetLink = `${frontendUrl}/update-password?token=${token}`;
    const isSent = await sendSystemMail(
      user.email,
      "Reset your password",
      `<p>We received a request to reset your password.</p>
       <p><a href="${resetLink}">Choose a new password</a> (link valid for 1 hour).</p>
       <p>If you didn't ask for this, you can ignore this email.</p>`,
    );

    if (!isSent) {
      console.warn(`[Auth] SMTP_HOST not set — password reset link for ${user.email}: ${resetLink}`);
    }
  }

  static async resetPassword(token: string, password: string) {
    const user = await authUserRepository.findByResetTokenHash(hashResetToken(token));
    const isTokenValid = Boolean(user?.reset_token_expires_at && user.reset_token_expires_at.getTime() >= Date.now());
    if (!user || !isTokenValid) {
      throw new ApiError(400, "Invalid or expired reset link. Please request a new one.");
    }

    await authUserRepository.replacePassword(user.id, await hashPassword(password));
  }

  static async refreshTokens(refreshToken: string) {
    const { sub: userId } = verifyRefreshToken(refreshToken);
    return this.issueAppSession(userId);
  }

  static async getProfile(userId: string) {
    const profile = await profileRepository.findWithPermissions(userId);
    if (!profile) throw new ApiError(404, "Profile not found");

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name ?? "",
      avatarUrl: profile.avatar_url,
      role: profile.role,
      organizationId: profile.organization_id,
      isActive: profile.is_active !== false,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      pagePermissions: profile.pagePermissions.map((permission) => ({
        pageKey: permission.page_key,
        canView: permission.can_view ?? false,
        canEdit: permission.can_edit ?? false,
        canDelete: permission.can_delete ?? false,
      })),
    };
  }
}
