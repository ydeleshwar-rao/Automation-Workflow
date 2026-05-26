import { createAdminClient } from "@/src/lib/supabase/admin";
import { getUserWithProfile, isAdminRole } from "@/src/services/auth.service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
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
      email, password, firstName, lastName, phone, companyName,
      role = "user", leadhubKey, websiteUrl,
      applications = [],
    } = body;
    // job_app_type = first selected application (ServiceM8 / Commusoft / etc.)
    const jobAppType = applications[0] || null;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 3. Create user in Auth (Auto-confirmed)
    //    NOTE: Supabase fires the on_auth_user_created trigger here.
    //    If your trigger is broken / missing columns, you get "unexpected_failure".
    //    Run supabase/migrations/20260323_fix_auth_trigger.sql in the Supabase SQL editor to fix it.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, role },
    });

    if (authError) {
      console.error("[create-user] Auth error:", {
        message: authError.message,
        code: (authError as any).code,
        status: authError.status,
      });
      throw authError;
    }

    // 4. Update profile — trigger already created the row via ON CONFLICT DO NOTHING.
    //    Use the EXACT column names from the DB schema.
    const profilePayload = {
      first_name:   firstName,
      last_name:    lastName,
      email,
      phone:        phone       || null,
      company_name: companyName || null,
      role,
      leadhub_key:  leadhubKey  || null,
      website_url:  websiteUrl  || null,
      job_app_type: jobAppType,            // ✅ Primary Application
    };
    console.log("[create-user] Profile payload:", profilePayload);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profilePayload)
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("[create-user] Profile update error:", profileError);
      throw new Error(`Profile update failed: ${profileError.message}`);
    }

    // 5. Assign authorized applications to user_applications table (best-effort)
    if (applications.length > 0) {
      const appInserts = applications.map((appId: string) => ({
        user_id: authData.user.id,
        app_id: appId,
      }));
      const { error: appError } = await supabaseAdmin
        .from("user_applications")
        .insert(appInserts);
      if (appError) console.warn("[create-user] user_applications insert skipped:", appError.message);
    }

    return NextResponse.json({ success: true, userId: authData.user.id });
  } catch (error: any) {
    console.error("User creation error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { supabase, user: adminUser, profile: adminProfile } = await getUserWithProfile();

    // 1. Check if current user is admin
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminRole(adminProfile?.role)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 2. Fetch all profiles
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, profiles });
  } catch (error: any) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 });
  }
}
