// BFF: GET /api/admin/push/people?q= → backend GET /api/admin/push/people (outsyde-backend #368).
// Answers id, name, username, role, hasToken, newsOptOut, canPush. No email and no push token.
// Real authorization is the backend's requirePlatformAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ success: true, people: [] });
  if (q.length > 100) return NextResponse.json({ error: "Search is too long." }, { status: 400 });
  return proxyToBackend(`/api/admin/push/people?q=${encodeURIComponent(q)}`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
