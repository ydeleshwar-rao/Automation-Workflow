/**
 * Supabase browser client — AUTH-ONLY stub.
 *
 * Architecture note:
 *   - All login/register/profile goes through backend API (custom JWT)
 *   - This client is kept ONLY for auth-specific flows that must
 *     go through Supabase directly:
 *       • forgot-password (supabase.auth.resetPasswordForEmail)
 *       • update-password (supabase.auth.updateUser)
 *
 * DO NOT use this for data queries — all data goes through axiosInstance.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Returns a Supabase client for auth-only operations. */
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // we use our own JWT session, not Supabase sessions
      autoRefreshToken: false,
      detectSessionInUrl: true,
    },
  });
}
