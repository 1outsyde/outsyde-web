import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readJsonObject } from "../_lib/bff";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  return forward(req, "PATCH", `/api/events/${id}`, body);
}
