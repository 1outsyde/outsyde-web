// BFF for admin push sends (outsyde-backend #368, server/routes/pushAdmin.ts).
//   GET  /api/admin/push/sends?limit&before → history, newest first.
//   POST /api/admin/push/sends → starts a send. Body { audience, userIds? (picked only), title, body, screen?, url?, clientKey }.
//        202 { sendId, recipients }; the same clientKey again answers 200 with the same send.
//        400 INVALID_*, NO_RECIPIENTS; 409 SEND_IN_PROGRESS, DUPLICATE_SEND; 429 OVER_DAILY_LIMIT.
// Only the known fields are forwarded; the backend re-validates everything.
// Real authorization is the backend's requirePlatformAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

const AUDIENCES = ["picked", "vendors", "photographers", "consumers", "all"];
const MAX_PICKED = 500; // backend MAX_PICKED (server/push/pushAudience.ts)

export async function GET(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const q = new URLSearchParams();
  const limit = req.nextUrl.searchParams.get("limit");
  const before = req.nextUrl.searchParams.get("before");
  if (limit && /^\d{1,3}$/.test(limit)) q.set("limit", limit);
  if (before && before.length <= 40) q.set("before", before);
  const qs = q.toString();
  return proxyToBackend(`/api/admin/push/sends${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}

export async function POST(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as
    | { audience?: unknown; userIds?: unknown; title?: unknown; body?: unknown; screen?: unknown; url?: unknown; clientKey?: unknown }
    | null;
  if (!b || typeof b.title !== "string" || typeof b.body !== "string") {
    return NextResponse.json({ error: "Add a title and a message." }, { status: 400 });
  }
  if (typeof b.audience !== "string" || !AUDIENCES.includes(b.audience)) {
    return NextResponse.json({ error: "Pick who to send to." }, { status: 400 });
  }
  if (typeof b.clientKey !== "string" || !b.clientKey || b.clientKey.length > 100) {
    return NextResponse.json({ error: "Reload the page and try again." }, { status: 400 });
  }
  let userIds: string[] | undefined;
  if (b.audience === "picked") {
    const ids = b.userIds;
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
  return proxyToBackend("/api/admin/push/sends", {
    method: "POST",
    headers: backendAuthHeaders(req) as Record<string, string>,
    body: {
      audience: b.audience,
      ...(userIds ? { userIds } : {}),
      title: b.title,
      body: b.body,
      ...(typeof b.screen === "string" ? { screen: b.screen } : {}),
      ...(typeof b.url === "string" && b.url ? { url: b.url } : {}),
      clientKey: b.clientKey,
    },
  });
}
