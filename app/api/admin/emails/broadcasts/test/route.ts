// BFF: POST /api/admin/emails/broadcasts/test → backend POST /api/admin/emails/broadcasts/test (outsyde-backend #292)
// Body { subject, html }. Sends the broadcast to the signed in admin only (subject gets "[Test] ").
// { sendId, to }; 400 INVALID_CONTENT; 429 OVER_DAILY_LIMIT. Counts toward the daily limit.
// Real authorization is the backend's requirePlatformAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { subject?: unknown; html?: unknown } | null;
  if (!body || typeof body.subject !== "string" || typeof body.html !== "string") {
    return NextResponse.json({ error: "Add a subject and the email HTML." }, { status: 400 });
  }
  return proxyToBackend("/api/admin/emails/broadcasts/test", {
    method: "POST",
    headers: backendAuthHeaders(req) as Record<string, string>,
    body: { subject: body.subject, html: body.html },
  });
}
