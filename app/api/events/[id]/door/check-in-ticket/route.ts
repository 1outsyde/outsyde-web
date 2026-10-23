import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readJsonObject } from "../../../_lib/bff";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  return forward(req, "POST", `/api/events/${id}/door/check-in-ticket`, body);
}
