import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../../_lib/bff";

type Ctx = { params: Promise<{ id: string; linkId: string }> };

/** p4-team step 9-0: cancel an open invite link. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id, linkId } = await params;
  if (!isUuid(id) || !isUuid(linkId)) return notFound();
  return forward(req, "DELETE", `/api/events/${id}/team/links/${linkId}`);
}
