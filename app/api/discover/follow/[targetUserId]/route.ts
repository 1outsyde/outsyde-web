import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../events/_lib/bff";

type Ctx = { params: Promise<{ targetUserId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { targetUserId } = await params;
  if (!isUuid(targetUserId)) return notFound();
  return forward(req, "GET", `/api/follows/check/${targetUserId}`);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { targetUserId } = await params;
  if (!isUuid(targetUserId)) return notFound();
  return forward(req, "POST", "/api/follows", { targetUserId });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { targetUserId } = await params;
  if (!isUuid(targetUserId)) return notFound();
  return forward(req, "DELETE", `/api/follows/${targetUserId}`);
}
