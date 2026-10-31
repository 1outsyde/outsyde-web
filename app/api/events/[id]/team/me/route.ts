import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../_lib/bff";

/** My own side of this event's team: my roles, times, notes from the host, my pay, my link, stay longer requests. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return forward(req, "GET", `/api/events/${id}/team/me`);
}
