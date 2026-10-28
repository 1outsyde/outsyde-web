import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../../_lib/bff";

/** Leave a door team invite (backend doorRouter.ts POST /door/invites/:inviteId/leave). No body. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ inviteId: string }> }) {
  const { inviteId } = await params;
  if (!isUuid(inviteId)) return notFound();
  return forward(req, "POST", `/api/events/door/invites/${inviteId}/leave`, {});
}
