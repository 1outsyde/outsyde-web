import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readJsonObject } from "../../../../../_lib/bff";

/** The host enters a To be discussed amount: { cents }. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; requestId: string }> }) {
  const { id, requestId } = await params;
  if (!isUuid(id) || !isUuid(requestId)) return notFound();
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  return forward(req, "PUT", `/api/events/${id}/team/stay-longer/${requestId}/amount`, body);
}
