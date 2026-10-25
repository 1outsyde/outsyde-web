// BFF: GET /api/admin/push/limits → backend GET /api/admin/push/limits (outsyde-backend #368).
// Real authorization is the backend's requirePlatformAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return proxyToBackend("/api/admin/push/limits", {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
