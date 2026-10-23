import { NextRequest } from "next/server";
import { forward, invalidBody, readJsonObject } from "../../_lib/bff";

export async function POST(req: NextRequest) {
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  return forward(req, "POST", "/api/events/host-agreement/accept", body);
}
