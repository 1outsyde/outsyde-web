import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../../_lib/bff";

type Ctx = { params: Promise<{ id: string; userId: string }> };

/** I paid them (host only). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id, userId } = await params;
  if (!isUuid(id) || !isUuid(userId)) return notFound();
  return forward(req, "POST", `/api/events/${id}/team-payouts/${userId}/paid`);
}

/** Undo I paid them, until they tap Got it. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id, userId } = await params;
  if (!isUuid(id) || !isUuid(userId)) return notFound();
  return forward(req, "DELETE", `/api/events/${id}/team-payouts/${userId}/paid`);
}
