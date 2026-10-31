import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readJsonObject, rolesAll } from "../../../_lib/bff";

type Ctx = { params: Promise<{ id: string }> };

/** The Event team. ?roles=all lists every role (step 8); without it Admissions only, as before. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return forward(req, "GET", `/api/events/${id}/door/team`, undefined, rolesAll(req));
}

/** Invite: { username, scope, role?, roleLabel?, cohostLevel? } (the backend checks every field). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  return forward(req, "POST", `/api/events/${id}/door/team`, body);
}
