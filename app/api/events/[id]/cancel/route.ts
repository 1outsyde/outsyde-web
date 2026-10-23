import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readOptionalJsonObject } from "../../_lib/bff";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readOptionalJsonObject(req);
  if (body === null) return invalidBody();
  return forward(req, "POST", `/api/events/${id}/cancel`, body);
}
