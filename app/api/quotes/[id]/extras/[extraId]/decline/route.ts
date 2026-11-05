import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../../_lib/bff";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; extraId: string }> }) {
  const { id, extraId } = await params;
  if (!isUuid(id) || !isUuid(extraId)) return notFound();
  return forward(req, "POST", `/api/quotes/${id}/extras/${extraId}/decline`, {});
}
