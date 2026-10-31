import { NextRequest } from "next/server";
import { forward, rolesAll } from "../../_lib/bff";

/** My open Event team invites (backend doorRouter.ts GET /door/invites). ?roles=all for every role (step 8). */
export async function GET(req: NextRequest) {
  return forward(req, "GET", "/api/events/door/invites", undefined, rolesAll(req));
}
