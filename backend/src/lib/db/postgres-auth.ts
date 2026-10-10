/**
 * Plain-PostgreSQL stand-in for the supabase.auth calls this backend makes,
 * backed by the public.auth_users table (DB_PROVIDER=postgres):
 *
 *   auth.signInWithPassword({ email, password })
 *   auth.getUser(googleIdToken)                    — Google sign-in
 *   auth.admin.createUser({ email, password, user_metadata })
 *   auth.admin.deleteUser(id)                      — cascades to profiles
 *   auth.admin.updateUserById(id, { password })
 *
 * Results use the supabase-js shape: { data: { user }, error }.
 */

import type pg from "pg";
import { hashPassword, verifyPassword } from "./password.js";

type AuthUserRow = {
  id: string;
  email: string;
  provider: string;
  user_metadata: Record<string, unknown>;
  created_at: string;
};

type AuthResult = { data: { user: ReturnType<typeof toUser> | null }; error: { message: string; status: number } | null };

const toUser = (row: AuthUserRow) => ({
  id: row.id,
  email: row.email,
  user_metadata: row.user_metadata ?? {},
  app_metadata: { provider: row.provider },
  created_at: row.created_at,
});

const ok = (row: AuthUserRow): AuthResult => ({ data: { user: toUser(row) }, error: null });
const fail = (message: string, status = 400): AuthResult => ({ data: { user: null }, error: { message, status } });

const USER_COLUMNS = "id, email, provider, user_metadata, created_at";

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  exp?: string;
  name?: string;
  picture?: string;
};

export function createPostgresAuth(pool: pg.Pool) {
  const findByEmail = async (email: string) => {
    const res = await pool.query(
      `SELECT ${USER_COLUMNS}, password_hash FROM auth_users WHERE lower(email) = lower($1)`, [email]);
    return res.rows[0] as (AuthUserRow & { password_hash: string | null }) | undefined;
  };

  return {
    async signInWithPassword({ email, password }: { email: string; password: string }): Promise<AuthResult> {
      try {
        const user = await findByEmail(email);
        if (!user || !(await verifyPassword(password, user.password_hash))) {
          return fail("Invalid login credentials", 400);
        }
        await pool.query(`UPDATE auth_users SET last_sign_in_at = now() WHERE id = $1`, [user.id]);
        return ok(user);
      } catch (err) {
        return fail((err as Error).message, 500);
      }
    },

    /** Verifies a Google ID token and returns (creating if needed) the matching user. */
    async getUser(idToken: string): Promise<AuthResult> {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return fail("Google sign-in is not configured (GOOGLE_CLIENT_ID is missing)", 500);

      try {
        const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        if (!res.ok) return fail("Invalid Google sign-in token", 401);
        const info = (await res.json()) as GoogleTokenInfo;

        if (info.aud !== clientId) return fail("Google token was issued for a different app", 401);
        if (Number(info.exp ?? 0) * 1000 < Date.now()) return fail("Google token has expired", 401);
        if (!info.email || String(info.email_verified) !== "true") return fail("Google email is not verified", 401);

        const metadata = { full_name: info.name ?? "", avatar_url: info.picture ?? null };
        const existing = await findByEmail(info.email);
        if (existing) {
          const updated = await pool.query(
            `UPDATE auth_users SET user_metadata = user_metadata || $2::jsonb, last_sign_in_at = now()
             WHERE id = $1 RETURNING ${USER_COLUMNS}`,
            [existing.id, JSON.stringify(metadata)]);
          return ok(updated.rows[0]);
        }

        const created = await pool.query(
          `INSERT INTO auth_users (email, provider, user_metadata, last_sign_in_at)
           VALUES ($1, 'google', $2::jsonb, now()) RETURNING ${USER_COLUMNS}`,
          [info.email.toLowerCase(), JSON.stringify(metadata)]);
        return ok(created.rows[0]);
      } catch (err) {
        return fail((err as Error).message, 500);
      }
    },

    admin: {
      async createUser(attrs: {
        email: string;
        password?: string;
        email_confirm?: boolean;
        user_metadata?: Record<string, unknown>;
      }): Promise<AuthResult> {
        try {
          if (await findByEmail(attrs.email)) return fail("User already registered", 422);
          const passwordHash = attrs.password ? await hashPassword(attrs.password) : null;
          const res = await pool.query(
            `INSERT INTO auth_users (email, password_hash, provider, user_metadata)
             VALUES ($1, $2, 'email', $3::jsonb) RETURNING ${USER_COLUMNS}`,
            [attrs.email.toLowerCase(), passwordHash, JSON.stringify(attrs.user_metadata ?? {})]);
          return ok(res.rows[0]);
        } catch (err) {
          const e = err as { code?: string; message: string };
          return e.code === "23505" ? fail("User already registered", 422) : fail(e.message, 500);
        }
      },

      async deleteUser(id: string): Promise<{ data: { user: null }; error: { message: string; status: number } | null }> {
        try {
          // profiles.id references auth_users.id ON DELETE CASCADE; delete the profile
          // explicitly too in case the database was created without that constraint.
          await pool.query(`DELETE FROM auth_users WHERE id = $1`, [id]);
          await pool.query(`DELETE FROM profiles WHERE id = $1`, [id]);
          return { data: { user: null }, error: null };
        } catch (err) {
          return { data: { user: null }, error: { message: (err as Error).message, status: 500 } };
        }
      },

      async updateUserById(id: string, attrs: { password?: string; user_metadata?: Record<string, unknown> }): Promise<AuthResult> {
        try {
          const passwordHash = attrs.password ? await hashPassword(attrs.password) : null;
          const res = await pool.query(
            `UPDATE auth_users
             SET password_hash = COALESCE($2, password_hash),
                 user_metadata = user_metadata || $3::jsonb
             WHERE id = $1 RETURNING ${USER_COLUMNS}`,
            [id, passwordHash, JSON.stringify(attrs.user_metadata ?? {})]);
          return res.rows[0] ? ok(res.rows[0]) : fail("User not found", 404);
        } catch (err) {
          return fail((err as Error).message, 500);
        }
      },
    },
  };
}
