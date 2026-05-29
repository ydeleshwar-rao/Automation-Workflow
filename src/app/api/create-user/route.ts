/**
 * DEPRECATED — This endpoint used the old Supabase-based user creation flow.
 *
 * In the new architecture, developers are created by admins via:
 *   POST /access/developers  (backend Express endpoint — auth via JWT Bearer)
 *
 * This route is disabled. Any call will receive a 410 Gone response.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint is deprecated. Use the Admin → Access panel to create developers.",
    },
    { status: 410 }
  );
}
