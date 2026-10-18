// GET /api/influencer/application → backend GET /api/influencer/application.
// Returns { application } (null when the person hasn't applied).

import { NextRequest } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: NextRequest) {
  return proxyToBackend("/api/influencer/application", {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
