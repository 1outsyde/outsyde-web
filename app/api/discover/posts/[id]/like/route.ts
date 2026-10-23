import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../../events/_lib/bff";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return forward(req, "POST", `/api/feed/${id}/like`);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return forward(req, "DELETE", `/api/feed/${id}/like`);
}
