import { supabaseAdmin } from "@/src/lib/supabaseAdmin";
import { resolveClientKey } from "@/src/lib/utils/client-key.utils";
import { getUserWithProfile, isAdminRole } from "@/src/services/auth.service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { user: adminUser, profile: adminProfile } = await getUserWithProfile();

    // 1. Check if current user is admin
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminRole(adminProfile?.role)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      email,
      password,
      first_name,
      last_name,
      role,
      job_app_type,
      company_name,
      leadhub_key,
      client_contact_name,
    } = body;

    if (!email || !password || !first_name || !last_name || !job_app_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 3. Check if user already exists in profiles
    const { data: existingUser } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    // 4. Create user in Auth (Auto-confirmed)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, role },
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("already been registered")) {
        return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const resolvedClientKey =
      leadhub_key?.trim() || (await resolveClientKey(company_name, client_contact_name));

    // 5. Update profile (trigger handles initial insert)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name,
        last_name,
        email,
        phone: body.phone || null,
        company_name,
        role,
        clientkey: resolvedClientKey,
        job_app_type,
        website_url: body.website_url || null,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("[create-user] Profile update error:", profileError);
      return NextResponse.json({ error: `Profile update failed: ${profileError.message}` }, { status: 500 });
    }

    // 6. Assign application to user_applications
    if (job_app_type) {
      await supabaseAdmin
        .from("user_applications")
        .insert({ user_id: authData.user.id, app_id: job_app_type });
    }

    return NextResponse.json({ success: true, userId: authData.user.id });
  } catch (error: any) {
    console.error("User creation error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 });
  }
}
