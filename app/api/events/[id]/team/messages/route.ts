import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readJsonObject } from "../../../_lib/bff";

type Ctx = { params: Promise<{ id: string }> };

/** Messages the host and co-hosts sent to the team (step 5). */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return forward(req, "GET", `/api/events/${id}/team/messages`);
}

/** Send: { to: team | role | person, role?, userId?, text }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  return forward(req, "POST", `/api/events/${id}/team/messages`, body);
}
