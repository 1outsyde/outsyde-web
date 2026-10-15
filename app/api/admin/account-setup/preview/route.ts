// BFF: GET /api/admin/account-setup/preview → backend GET /api/admin/account-setup/preview
// Dry run of the setup reminders: everyone with an email due right now. Writes nothing.
// Backend: { success, count, reminders: [{ userId, email, displayName, role, reminderNumber,
//   template: "claim" | "steps_left", steps, channels, outcome }] }
// Real authorization is the backend's requirePlatformAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return proxyToBackend("/api/admin/account-setup/preview", {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
