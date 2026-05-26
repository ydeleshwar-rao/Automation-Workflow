import { createClient } from "@/src/lib/supabase/server";

export function isAdminRole(role: string | null | undefined) {
  return role?.toLowerCase() === "admin";
}

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function getUserWithProfile() {
  const { supabase, user } = await getAuthUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, clientkey")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile };
}
