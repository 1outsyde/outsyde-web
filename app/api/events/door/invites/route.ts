import { NextRequest } from "next/server";
import { forward } from "../../_lib/bff";

/** My open door team invites (backend doorRouter.ts GET /door/invites). */
export async function GET(req: NextRequest) {
  return forward(req, "GET", "/api/events/door/invites");
}
