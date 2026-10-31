import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../../../../_lib/bff";

const ANSWERS = new Set(["accept", "decline"]);

/** Accept or decline a request to stay longer (the person asked). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; requestId: string; answer: string }> }) {
  const { id, requestId, answer } = await params;
  if (!isUuid(id) || !isUuid(requestId) || !ANSWERS.has(answer)) return notFound();
  return forward(req, "POST", `/api/events/${id}/team/me/stay-longer/${requestId}/${answer}`);
}
