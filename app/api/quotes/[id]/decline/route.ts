import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readBody } from "../../_lib/bff";

// The customer declines the quote. Body { reason? }.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readBody(req);
  if (!body) return invalidBody();
  return forward(req, "POST", `/api/quotes/${id}/decline`, typeof body.reason === "string" ? { reason: body.reason.slice(0, 500) } : {});
}
