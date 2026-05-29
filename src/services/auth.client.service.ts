/**
 * auth.client.service.ts
 *
 * Supabase auth helpers for flows that MUST go through Supabase directly:
 *   - forgot-password  (resetPasswordForEmail)
 *   - update-password  (updateUser with new password via recovery token)
 *
 * NOTE: We use a custom JWT for all other authentication. The Supabase client
 * here has persistSession: false, so supabase.auth.getUser() will always
 * return null — do NOT use this file for general auth checks.
 * All login/register/profile operations go through axiosInstance → backend.
 */

import { createClient } from "@/src/lib/supabase/client";

/** Returns a Supabase client scoped to auth-only operations. */
export function getSupabaseAuthClient() {
  return createClient();
}
