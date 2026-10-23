import { NextRequest } from "next/server";
import { forward } from "../../events/_lib/bff";

export async function GET(req: NextRequest) {
  return forward(req, "GET", "/api/stories/feed");
}
