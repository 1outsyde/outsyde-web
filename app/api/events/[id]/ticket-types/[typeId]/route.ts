import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readJsonObject } from "../../../_lib/bff";

type Ctx = { params: Promise<{ id: string; typeId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, typeId } = await params;
  if (!isUuid(id) || !isUuid(typeId)) return notFound();
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  return forward(req, "PATCH", `/api/events/${id}/ticket-types/${typeId}`, body);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id, typeId } = await params;
  if (!isUuid(id) || !isUuid(typeId)) return notFound();
  return forward(req, "DELETE", `/api/events/${id}/ticket-types/${typeId}`);
}
