import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { backendAuthHeaders } from "@/lib/admin-auth";

// Friend invite card on /account/points (2026-10-23): the signed-in customer's code, share link and
// counts from GET /api/referral/code. Sends the app token and the session cookie (vendors who signed
// up on the web only have the cookie); the backend answers 401 when neither is valid.
export async function GET(req: NextRequest) {
  return proxyToBackend("/api/referral/code", { method: "GET", headers: backendAuthHeaders(req) as Record<string, string> });
}
