import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readJsonObject } from "../../../_lib/bff";

type Ctx = { params: Promise<{ id: string }> };

/** p4-team step 9-0: open invite links for this event (and the host's All my events links). Host and co-hosts. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return forward(req, "GET", `/api/events/${id}/team/links`);
}

/** Make a one person link: { scope, role, roleLabel?, cohostLevel?, pay?, email? } (the backend checks every field). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  return forward(req, "POST", `/api/events/${id}/team/links`, body);
}
