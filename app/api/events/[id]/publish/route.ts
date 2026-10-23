import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound } from "../../_lib/bff";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();

  return forward(req, "POST", `/api/events/${id}/publish`);
}
