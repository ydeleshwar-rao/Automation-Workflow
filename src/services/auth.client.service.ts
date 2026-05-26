import { createClient } from "@/src/lib/supabase/client";

export async function getClientAuthUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[Auth] supabase.auth.getUser failed:", error.message);
  }
  if (!user) {
    console.warn("[Auth] No authenticated user found — session may have expired or user is not logged in.");
  }

  return { supabase, user };
}

export async function getClientUserWithProfile() {
  const { supabase, user } = await getClientAuthUser();

  if (!user) {
    console.warn("[Auth] Skipping profile fetch — no authenticated user.");
    return { supabase, user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, clientkey")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error(`[Auth] Failed to fetch profile for user ${user.id}:`, error.message);
  } else if (!profile) {
    console.warn(`[Auth] No profile row found for user ${user.id}.`);
  } else if (!profile.clientkey) {
    console.warn(`[Auth] Profile found for user ${user.id} but clientkey is null/empty.`);
  }

  return { supabase, user, profile };
}
