import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readBody } from "../../../../_lib/bff";

// Approve an extra. Body { newCard? }. needs_action: finish the clientSecret on the page, then call again.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; extraId: string }> }) {
  const { id, extraId } = await params;
  if (!isUuid(id) || !isUuid(extraId)) return notFound();
  const body = await readBody(req);
  if (!body) return invalidBody();
  return forward(req, "POST", `/api/quotes/${id}/extras/${extraId}/approve`, body.newCard === true ? { newCard: true } : {});
}
