// BFF: POST /api/admin/account-setup/send { userIds } → backend POST /api/admin/account-setup/send
//
// userIds is REQUIRED here on purpose: without it the backend emails everyone who is due, and this
// page must only ever email the people ticked. dryRun:false is always set here. The backend
// re-checks the ids (1 to 200) and skips anyone no longer due (already emailed, finished, opted out),
// returning them as `notDue`. Real authorization is the backend's requirePlatformAdmin.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

const MAX_PICKED = 200;

export async function POST(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const userIds = (body as { userIds?: unknown } | null)?.userIds;
  if (
    !Array.isArray(userIds) ||
    userIds.length === 0 ||
    userIds.length > MAX_PICKED ||
    !userIds.every((v: unknown) => typeof v === "string" && v.length > 0 && v.length <= 100)
  ) {
    return NextResponse.json({ error: `Pick between 1 and ${MAX_PICKED} people.` }, { status: 400 });
  }
  return proxyToBackend("/api/admin/account-setup/send", {
    method: "POST",
    headers: backendAuthHeaders(req) as Record<string, string>,
    body: { dryRun: false, userIds },
  });
}
