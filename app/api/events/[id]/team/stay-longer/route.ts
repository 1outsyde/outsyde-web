import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../_lib/bff";

/** Every request to stay longer at this event (host and co-hosts). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return forward(req, "GET", `/api/events/${id}/team/stay-longer`);
}
