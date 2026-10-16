// BFF: GET /api/admin/emails/budget → backend GET /api/admin/emails/budget (outsyde-backend #292)
// { sentToday, limit, remaining }: emails sent from the admin pages today (New York day) against the
// daily limit (80 by default, BROADCAST_DAILY_LIMIT; limit null = no limit).
// Real authorization is the backend's requirePlatformAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return proxyToBackend("/api/admin/emails/budget", {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
