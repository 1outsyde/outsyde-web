import { NextRequest } from "next/server";
import { badRequest, forward } from "../../_lib/bff";

const HOST_TYPES = new Set(["user", "business", "photographer"]);

export async function GET(req: NextRequest) {
  const hostType = req.nextUrl.searchParams.get("hostType") ?? "user";
  if (!HOST_TYPES.has(hostType)) return badRequest("INVALID_HOST_TYPE", "Unknown host type.");
  return forward(req, "GET", `/api/events/payouts/status?hostType=${hostType}`);
}
