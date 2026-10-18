// GET /api/admin/users/[id] → backend GET /api/admin/users/:id (requireAdmin).
// Returns { user, signupDetails, business, photographer, orders, bookings }; signupDetails
// (2026-10-18) holds every signup answer as labelled rows, interests first.
// Same auth forward as the photographer detail BFF.

import { NextRequest } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
