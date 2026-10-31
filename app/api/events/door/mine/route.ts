import { NextRequest } from "next/server";
import { forward, rolesAll } from "../../_lib/bff";

/** My events to scan, or with ?roles=all every event I'm on the team for (p4-team step 8). */
export async function GET(req: NextRequest) {
  return forward(req, "GET", "/api/events/door/mine", undefined, rolesAll(req));
}
