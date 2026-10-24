// POST /api/admin/events/recoveries/:recoveryId/resolve  { action: "collected" | "written_off" }
// Only the action is forwarded. The backend enforces the state guard (409 NOT_OWED).

import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/admin-auth";
import { forwardAdmin, isValidId, notFound, notSignedIn } from "../../../_lib";

type Ctx = { params: Promise<{ recoveryId: string }> };

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  if (!getTokenFromRequest(req)) return notSignedIn();
  const { recoveryId } = await params;
  if (!isValidId(recoveryId)) return notFound();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = null;
  }
  const action = (raw as { action?: unknown } | null)?.action;
  if (action !== "collected" && action !== "written_off") {
    return NextResponse.json({ error: "Choose collected or written off.", code: "INVALID_BODY" }, { status: 400 });
  }

  return forwardAdmin(req, {
    method: "POST",
    ids: [recoveryId],
    path: ([i]) => `/api/admin/events/recoveries/${encodeURIComponent(i)}/resolve`,
    body: { action },
  });
}
