// BFF: GET /api/admin/push/sends/:id → backend GET /api/admin/push/sends/:id (outsyde-backend #368).
// One send with its recipients (account id, name, role, status, error code). No token, no email.
// Real authorization is the backend's requirePlatformAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  if (!id || id.length > 100) return NextResponse.json({ error: "Missing send id." }, { status: 400 });
  return proxyToBackend(`/api/admin/push/sends/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
