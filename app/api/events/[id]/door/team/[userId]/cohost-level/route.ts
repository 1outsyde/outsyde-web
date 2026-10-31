import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readJsonObject } from "../../../../../_lib/bff";

/** A co-host's level: { scope, level: team | edit } (host only). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  if (!isUuid(id) || !isUuid(userId)) return notFound();
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  return forward(req, "PUT", `/api/events/${id}/door/team/${userId}/cohost-level`, body);
}
