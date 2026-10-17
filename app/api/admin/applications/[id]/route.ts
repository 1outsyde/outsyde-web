// GET /api/admin/applications/[id] → backend GET /api/admin/applications/:id (requireAdmin).
// Returns { application } with `signupDetails` (every signup answer as labelled rows).
// Same auth forward as the list BFF (app/api/admin/applications/route.ts).

import { NextRequest } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/api/admin/applications/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
