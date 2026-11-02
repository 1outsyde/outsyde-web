// POST /api/admin/events/posts/:postId/action  { action: "remove" | "dismiss", reason } → backend
// POST /api/admin/moderation/action { targetId, targetType: "post", action, notes } (p5-safety W5, the older admin
// moderation route: remove hides the post from every feed; both close the post's reports with the reason as notes).

import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/admin-auth";
import { badBody, cleanReason, forwardAdmin, isValidId, notFound, notSignedIn, readBody } from "../../../_lib";

type Ctx = { params: Promise<{ postId: string }> };

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  if (!getTokenFromRequest(req)) return notSignedIn();
  const { postId } = await params;
  if (!isValidId(postId)) return notFound();
  const b = await readBody(req);
  const action = b?.action;
  if (action !== "remove" && action !== "dismiss") return badBody("Choose remove or dismiss.");
  const reason = cleanReason(b?.reason);
  if (!reason) return badBody("Add a reason (up to 500 characters).");
  return forwardAdmin(req, {
    method: "POST",
    ids: [postId],
    path: () => `/api/admin/moderation/action`,
    body: { targetId: postId, targetType: "post", action, notes: reason },
  });
}
