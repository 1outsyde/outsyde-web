// GET /api/admin/photographers/[id] → backend GET /api/admin/photographers/:id (requireAdmin).
// Returns { photographer, signupDetails } (every signup answer as labelled rows, 2026-10-18).
// Same auth forward as the application detail BFF.

import { NextRequest } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/api/admin/photographers/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
