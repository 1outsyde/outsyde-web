// BFF: GET /api/admin/emails/audiences → backend GET /api/admin/emails/audiences (outsyde-backend #292)
// { counts: { vendors, photographers, consumers, all } }: who would get a broadcast right now
// (unsubscribed, disabled, deleted, demo and admin accounts already left out).
// Real authorization is the backend's requirePlatformAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return proxyToBackend("/api/admin/emails/audiences", {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
