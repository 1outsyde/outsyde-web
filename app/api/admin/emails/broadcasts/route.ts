// BFF: POST /api/admin/emails/broadcasts → backend POST /api/admin/emails/broadcasts (outsyde-backend #292)
// Body { audience: picked|vendors|photographers|consumers|all, userIds? (picked only), subject, html }.
// Backend answers 202 { sendId, recipients } and sends in the background; 400 INVALID_CONTENT,
// INVALID_AUDIENCE, NO_RECIPIENTS; 429 OVER_DAILY_LIMIT. Only the known fields are forwarded.
// The backend re-validates everything; this route only rejects bodies that are obviously wrong.
// Real authorization is the backend's requirePlatformAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

const AUDIENCES = ["picked", "vendors", "photographers", "consumers", "all"];
const MAX_PICKED = 500; // backend MAX_PICKED

export async function POST(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as
    | { audience?: unknown; userIds?: unknown; subject?: unknown; html?: unknown }
    | null;
  if (!body || typeof body.subject !== "string" || typeof body.html !== "string") {
    return NextResponse.json({ error: "Add a subject and the email HTML." }, { status: 400 });
  }
  if (typeof body.audience !== "string" || !AUDIENCES.includes(body.audience)) {
    return NextResponse.json({ error: "Pick who to send to." }, { status: 400 });
  }
  let userIds: string[] | undefined;
  if (body.audience === "picked") {
    const ids = body.userIds;
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > MAX_PICKED ||
      !ids.every((v: unknown) => typeof v === "string" && v.length > 0 && v.length <= 100)
    ) {
      return NextResponse.json({ error: `Pick between 1 and ${MAX_PICKED} people.` }, { status: 400 });
    }
    userIds = ids as string[];
  }
  return proxyToBackend("/api/admin/emails/broadcasts", {
    method: "POST",
    headers: backendAuthHeaders(req) as Record<string, string>,
    body: { audience: body.audience, ...(userIds ? { userIds } : {}), subject: body.subject, html: body.html },
  });
}
