import { NextRequest } from "next/server";
import { forward, invalidBody, readJsonObject } from "../../_lib/bff";

export async function POST(req: NextRequest) {
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  // The acceptance record keeps the person's browser User-Agent (the backend trims it to 500 characters).
  const ua = req.headers.get("user-agent");
  return forward(req, "POST", "/api/events/host-agreement/accept", body, undefined, ua ? { "User-Agent": ua } : undefined);
}
