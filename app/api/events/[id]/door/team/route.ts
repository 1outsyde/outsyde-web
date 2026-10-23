import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readJsonObject } from "../../../_lib/bff";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  return forward(req, "GET", `/api/events/${id}/door/team`);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  return forward(req, "POST", `/api/events/${id}/door/team`, body);
}
