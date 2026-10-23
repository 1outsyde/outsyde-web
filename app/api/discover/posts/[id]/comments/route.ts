import { NextRequest } from "next/server";
import { badRequest, forward, invalidBody, isUuid, notFound, readJsonObject } from "../../../../events/_lib/bff";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return forward(req, "GET", `/api/feed/${id}/comments`);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (content.length < 1 || content.length > 500) return badRequest("INVALID_BODY", "Comment must be 1 to 500 characters.");
  return forward(req, "POST", `/api/feed/${id}/comments`, { content });
}
