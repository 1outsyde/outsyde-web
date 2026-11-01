import { NextRequest } from "next/server";
import { forward, invalidBody, readJsonObject } from "../../_lib/bff";

/** p4-team step 9d-2: accept the Event Team note { version }. Same as the Host Agreement's accept route. */
export async function POST(req: NextRequest) {
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  // The acceptance record keeps the person's browser User-Agent (the backend trims it to 500 characters).
  const ua = req.headers.get("user-agent");
  return forward(req, "POST", "/api/events/team-note/accept", body, undefined, ua ? { "User-Agent": ua } : undefined);
}
