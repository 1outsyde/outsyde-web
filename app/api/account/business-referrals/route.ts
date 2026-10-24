import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { backendAuthHeaders } from "@/lib/admin-auth";

// Business referral card (2026-10-24): the businesses this person referred and their $25 payouts,
// from GET /api/referral/business. Token or session cookie; the backend answers 401 when neither works.
export async function GET(req: NextRequest) {
  return proxyToBackend("/api/referral/business", { method: "GET", headers: backendAuthHeaders(req) as Record<string, string> });
}
