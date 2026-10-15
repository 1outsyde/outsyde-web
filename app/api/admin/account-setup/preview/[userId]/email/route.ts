// BFF: GET /api/admin/account-setup/preview/:userId/email
//   → backend GET /api/admin/account-setup/preview/:userId/email (outsyde-backend #291)
// The exact email one person would get right now: { subject, html, text, template, reminderNumber }.
// Built, never sent. 404 NOT_DUE when nothing is due for them.
// Real authorization is the backend's requirePlatformAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ userId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { userId } = await params;
  if (!userId || userId.length > 100) return NextResponse.json({ error: "Missing account id." }, { status: 400 });
  return proxyToBackend(`/api/admin/account-setup/preview/${encodeURIComponent(userId)}/email`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
