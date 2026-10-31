import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../../../_lib/bff";

const ANSWERS = new Set(["got-it", "not-yet"]);

/** Got it / Not yet after the host taps I paid them (4b-2). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; answer: string }> }) {
  const { id, answer } = await params;
  if (!isUuid(id) || !ANSWERS.has(answer)) return notFound();
  return forward(req, "POST", `/api/events/${id}/team/me/payout/${answer}`);
}
