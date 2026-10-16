// BFF: GET /api/admin/emails/sends?limit&before → backend GET /api/admin/emails/sends (outsyde-backend #292)
// History by send, newest first: { sends: [...] }. limit 1 to 100 (backend default 50); before = ISO
// created_at of the last row shown, for "Load older sends".
// Real authorization is the backend's requirePlatformAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const qs = new URLSearchParams();
  const limit = Number(req.nextUrl.searchParams.get("limit"));
  if (Number.isFinite(limit) && limit > 0) qs.set("limit", String(Math.min(Math.floor(limit), 100)));
  const before = req.nextUrl.searchParams.get("before");
  if (before && before.length <= 64 && !Number.isNaN(Date.parse(before))) qs.set("before", before);
  const q = qs.toString();
  return proxyToBackend(`/api/admin/emails/sends${q ? `?${q}` : ""}`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
