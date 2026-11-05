import { NextRequest } from "next/server";
import { badRequest, forward, invalidBody, isUuid, notFound, readBody } from "../../_lib/bff";

// Pay the deposit or the full price. Only the version is forwarded (the quote the customer is looking at).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readBody(req);
  if (!body) return invalidBody();
  if (!Number.isInteger(body.version) || (body.version as number) < 1) return badRequest("INVALID_VERSION", "Refresh the quote and try again.");
  return forward(req, "POST", `/api/quotes/${id}/pay`, { version: body.version });
}
