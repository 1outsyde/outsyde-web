// BFF: POST /api/admin/push/test → backend POST /api/admin/push/test (outsyde-backend #368).
// Body { title, body, screen?, url? }. Pushes to the signed in admin's own phone only.
// Backend answers { sendId, status: sent|failed, error } or 400 NO_TOKEN, INVALID_CONTENT, INVALID_SCREEN.
// Only the known fields are forwarded. Real authorization is the backend's requirePlatformAdmin.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { title?: unknown; body?: unknown; screen?: unknown; url?: unknown } | null;
  if (!b || typeof b.title !== "string" || typeof b.body !== "string") {
    return NextResponse.json({ error: "Add a title and a message." }, { status: 400 });
  }
  return proxyToBackend("/api/admin/push/test", {
    method: "POST",
    headers: backendAuthHeaders(req) as Record<string, string>,
    body: {
      title: b.title,
      body: b.body,
      ...(typeof b.screen === "string" ? { screen: b.screen } : {}),
      ...(typeof b.url === "string" && b.url ? { url: b.url } : {}),
    },
  });
}
