import { supabase, DB_PROVIDER }                 from "../../../config/db.config.js";
import { issueTokenPair, verifyRefreshToken }   from "../jwt.js";
import type { UserRole }                        from "../jwt.js";
import { ApiError }                             from "../../../utils/ApiError.js";
import { createResetToken, hashResetToken }     from "../../../lib/db/password.js";
import { sendSystemMail }                       from "../../../utils/system-mail.js";
import { SsoService }                           from "../../sso/sso.service.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  organization_id: string;
  is_active: boolean | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
};

type PagePermissionRow = {
  page_key: string;
  can_view?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
};

export class AuthService {
  private static async createOrganization(
    name: string,
    ownerId?: string,
    type: "individual" | "company" = "individual",
  ): Promise<string> {
    const { data, error } = await supabase
      .from("organizations")
      // Workspace type exists from migration 0030 (DB_PROVIDER=postgres)
      .insert({ name, owner_id: ownerId ?? null, ...(DB_PROVIDER === "postgres" ? { type } : {}) })
      .select("id")
      .single();

    if (error) throw new ApiError(500, error.message);
    if (!data?.id) throw new ApiError(500, "Failed to create organization");
    return data.id as string;
  }

  private static async getProfileRow(userId: string): Promise<ProfileRow> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,organization_id,is_active,avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new ApiError(500, error.message);
    if (!data) throw new ApiError(404, "Profile not found. Please contact an administrator.");
    if (data.is_active === false) {
      throw new ApiError(403, "Your account has been deactivated. Contact an administrator.");
    }
    if (!data.organization_id) {
      throw new ApiError(403, "Your account is not assigned to an organization.");
    }

    return data as ProfileRow;
  }

  private static async getViewPermissions(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("page_permissions")
      .select("page_key")
      .eq("user_id", userId)
      .eq("can_view", true);

    if (error) throw new ApiError(500, error.message);
    return ((data ?? []) as PagePermissionRow[]).map((permission) => permission.page_key);
  }

  /** Issues our JWT pair for a user (also used by company SSO sign-in). */
  static async issueAppSession(userId: string) {
    const profile = await this.getProfileRow(userId);
    const permissions = profile.role === "developer"
      ? await this.getViewPermissions(userId)
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
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      throw new ApiError(401, authError?.message ?? "Invalid email or password");
    }

    await SsoService.assertPasswordLoginAllowed(authData.user.id);
    return this.issueAppSession(authData.user.id);
  }

  static async googleLogin(supabaseAccessToken: string) {
    const { data, error } = await supabase.auth.getUser(supabaseAccessToken);

    if (error || !data.user) {
      throw new ApiError(401, error?.message ?? "Invalid Google sign-in session");
    }

    const user = data.user;
    const email = user.email?.trim().toLowerCase();
    if (!email) throw new ApiError(400, "Google account did not return an email address");

    const meta = user.user_metadata as Record<string, unknown>;
    const fullName =
      typeof meta.full_name === "string" && meta.full_name.trim()
        ? meta.full_name.trim()
        : typeof meta.name === "string" && meta.name.trim()
          ? meta.name.trim()
          : email.split("@")[0] ?? "";
    const avatarUrl =
      typeof meta.avatar_url === "string"
        ? meta.avatar_url
        : typeof meta.picture === "string"
          ? meta.picture
          : null;

    const { data: existingProfile, error: existingError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (existingError) throw new ApiError(500, existingError.message);

    const organizationId =
      existingProfile?.organization_id ??
      await this.createOrganization(`${fullName || email}'s Workspace`, user.id);

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: existingProfile?.organization_id ? undefined : "admin",
        organization_id: organizationId,
        is_active: true,
      }, { onConflict: "id" });

    if (upsertError) throw new ApiError(500, upsertError.message);

    return this.issueAppSession(user.id);
  }

  static async isSetupRequired(): Promise<boolean> {
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (error) throw new ApiError(500, error.message);
    return (count ?? 0) === 0;
  }

  static async setupAdmin(email: string, password: string, fullName: string, organizationName?: string) {
    await SsoService.assertEmailSignupAllowed(email);
    const organizationId = await this.createOrganization(
      organizationName?.trim() || `${fullName}'s Organization`,
      undefined,
      "company",
    );

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "admin", organization_id: organizationId },
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("already registered")) {
        throw new ApiError(409, "An account with this email already exists");
      }
      throw new ApiError(400, authError.message);
    }

    if (!authData.user?.id) throw new ApiError(500, "Failed to create auth user");

    const userId = authData.user.id;
    await supabase.from("organizations").update({ owner_id: userId }).eq("id", organizationId);

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role: "admin",
        organization_id: organizationId,
        is_active: true,
      }, { onConflict: "id" });

    if (upsertError) throw new ApiError(500, upsertError.message);

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
    const organizationId = await this.createOrganization(`${fullName}'s Workspace`);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "admin", organization_id: organizationId },
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("already registered")) {
        throw new ApiError(409, "An account with this email already exists");
      }
      throw new ApiError(400, authError.message);
    }

    if (!authData.user?.id) throw new ApiError(500, "Failed to create user account");

    const userId = authData.user.id;
    await supabase.from("organizations").update({ owner_id: userId }).eq("id", organizationId);

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role: "admin",
        organization_id: organizationId,
        is_active: true,
      }, { onConflict: "id" });

    if (upsertError) throw new ApiError(500, upsertError.message);

    return {
      user_id:   userId,
      email,
      full_name: fullName,
      organization_id: organizationId,
    };
  }

  /**
   * Postgres provider only — with Supabase the frontend uses Supabase's own
   * reset-password emails. Always succeeds so emails can't be enumerated.
   */
  static async requestPasswordReset(email: string) {
    if (DB_PROVIDER !== "postgres") {
      throw new ApiError(400, "Password reset is handled by Supabase for this deployment");
    }

    const { data: user, error } = await supabase
      .from("auth_users")
      .select("id,email")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (error) throw new ApiError(500, error.message);
    if (!user) return;

    const { token, tokenHash } = createResetToken();
    const { error: updateError } = await supabase
      .from("auth_users")
      .update({
        reset_token_hash: tokenHash,
        reset_token_expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
      })
      .eq("id", user.id);

    if (updateError) throw new ApiError(500, updateError.message);

    const frontendUrl = (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const link = `${frontendUrl}/update-password?token=${token}`;
    const sent = await sendSystemMail(
      user.email,
      "Reset your password",
      `<p>We received a request to reset your password.</p>
       <p><a href="${link}">Choose a new password</a> (link valid for 1 hour).</p>
       <p>If you didn't ask for this, you can ignore this email.</p>`,
    );

    if (!sent) {
      console.warn(`[Auth] SMTP_HOST not set — password reset link for ${user.email}: ${link}`);
    }
  }

  static async resetPassword(token: string, password: string) {
    if (DB_PROVIDER !== "postgres") {
      throw new ApiError(400, "Password reset is handled by Supabase for this deployment");
    }

    const { data: user, error } = await supabase
      .from("auth_users")
      .select("id,reset_token_expires_at")
      .eq("reset_token_hash", hashResetToken(token))
      .maybeSingle();

    if (error) throw new ApiError(500, error.message);
    if (!user || !user.reset_token_expires_at || new Date(user.reset_token_expires_at).getTime() < Date.now()) {
      throw new ApiError(400, "Invalid or expired reset link. Please request a new one.");
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (updateError) throw new ApiError(500, updateError.message);

    await supabase
      .from("auth_users")
      .update({ reset_token_hash: null, reset_token_expires_at: null })
      .eq("id", user.id);
  }

  static async refreshTokens(refreshToken: string) {
    const { sub: userId } = verifyRefreshToken(refreshToken);
    return this.issueAppSession(userId);
  }

  static async getProfile(userId: string) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,full_name,avatar_url,role,organization_id,is_active,created_at,updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw new ApiError(500, profileError.message);
    if (!profile) throw new ApiError(404, "Profile not found");

    const { data: permissions, error: permissionsError } = await supabase
      .from("page_permissions")
      .select("page_key,can_view,can_edit,can_delete")
      .eq("user_id", userId);

    if (permissionsError) throw new ApiError(500, permissionsError.message);

    const row = profile as ProfileRow;
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
      pagePermissions: ((permissions ?? []) as PagePermissionRow[]).map((permission) => ({
        pageKey: permission.page_key,
        canView: permission.can_view ?? false,
        canEdit: permission.can_edit ?? false,
        canDelete: permission.can_delete ?? false,
      })),
    };
  }
}
