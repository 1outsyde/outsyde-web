import { NextRequest } from "next/server";
import { getTokenFromRequest } from "./admin-auth";

/**
 * The signed-in vendor's access token for a BFF: the httpOnly cookie, or the x-auth-token header the
 * app's ?token= handoff sends on the first calls (same rule as /api/subscription/status).
 */
export function getVendorToken(req: NextRequest): string | null {
  return getTokenFromRequest(req) || req.headers.get("x-auth-token") || null;
}
