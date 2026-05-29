/**
 * DEPRECATED — This Next.js API route has been removed.
 *
 * User / developer creation is now handled exclusively by the backend Express API.
 * Admin → Access panel calls  POST /access/developers  on the backend.
 *
 * Returning 410 Gone so any stale client code gets a clear signal rather than a 404.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use the Admin → Access panel to create developers." },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use the backend /access/developers endpoint." },
    { status: 410 },
  );
}
