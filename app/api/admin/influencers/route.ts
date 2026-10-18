// GET /api/admin/influencers → backend GET /api/admin/influencers (requireAdmin).
// Optional ?status=pending|approved|rejected. Returns { applications }.

import { NextRequest } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

const STATUSES = new Set(["pending", "approved", "rejected"]);

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const query = status && STATUSES.has(status) ? `?status=${status}` : "";
  return proxyToBackend(`/api/admin/influencers${query}`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
