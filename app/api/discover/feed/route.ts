import { NextRequest } from "next/server";
import { forward } from "../../events/_lib/bff";
import { FEED_RULES, pickKeys } from "../_lib/keys";

export async function GET(req: NextRequest) {
  return forward(req, "GET", "/api/feed", undefined, pickKeys(req.nextUrl.searchParams, FEED_RULES));
}
