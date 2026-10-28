import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../_lib/bff";

/** One door team invite, only for the person invited (backend answers 404 for anyone else). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ inviteId: string }> }) {
  const { inviteId } = await params;
  if (!isUuid(inviteId)) return notFound();
  return forward(req, "GET", `/api/events/door/invites/${inviteId}`);
}
