import { NextRequest } from "next/server";
import { badRequest, forward, invalidBody, isUuid, notFound, readJsonObject, roleParam } from "../../../../../_lib/bff";

/** Pay for one person in one role (host only). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  if (!isUuid(id) || !isUuid(userId)) return notFound();
  const role = roleParam(req);
  if (!role) return badRequest("INVALID_REQUEST", "role: choose door, security, host, entertainment, media, cohost or other.");
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  return forward(req, "PUT", `/api/events/${id}/door/team/${userId}/pay`, body, new URLSearchParams({ role }));
}
