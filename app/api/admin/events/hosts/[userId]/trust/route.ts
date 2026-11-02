// POST /api/admin/events/hosts/:userId/trust  { trusted: boolean, note?: string } → backend (p5-safety W4).
// Only trusted and a trimmed note (up to 500) are forwarded.

import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/admin-auth";
import { badBody, forwardAdmin, isValidId, notFound, notSignedIn, readBody } from "../../../_lib";

type Ctx = { params: Promise<{ userId: string }> };

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  if (!getTokenFromRequest(req)) return notSignedIn();
  const { userId } = await params;
  if (!isValidId(userId)) return notFound();
  const b = await readBody(req);
  if (typeof b?.trusted !== "boolean") return badBody("Choose trusted or not.");
  const note = typeof b.note === "string" ? b.note.trim() : "";
  if (note.length > 500) return badBody("Keep the note under 500 characters.");
  return forwardAdmin(req, {
    method: "POST",
    ids: [userId],
    path: ([i]) => `/api/admin/events/hosts/${encodeURIComponent(i)}/trust`,
    body: note ? { trusted: b.trusted, note } : { trusted: b.trusted },
  });
}
