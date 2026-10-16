// BFF: GET /api/admin/emails/people/:userId/emails
//   → backend GET /api/admin/emails/people/:userId/emails (outsyde-backend #292)
// History by person: { person: { id, email, name, unsubscribed }, emails: [...] } newest first.
// Real authorization is the backend's requirePlatformAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ userId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { userId } = await params;
  if (!userId || userId.length > 100) return NextResponse.json({ error: "Missing account id." }, { status: 400 });
  return proxyToBackend(`/api/admin/emails/people/${encodeURIComponent(userId)}/emails`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
