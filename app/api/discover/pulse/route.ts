import { NextRequest } from "next/server";
import { forward } from "../../events/_lib/bff";
import { PULSE_RULES, pickKeys } from "../_lib/keys";

export async function GET(req: NextRequest) {
  return forward(req, "GET", "/api/pulse/feed", undefined, pickKeys(req.nextUrl.searchParams, PULSE_RULES));
}
