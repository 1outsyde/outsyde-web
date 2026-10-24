// GET /api/admin/events → backend GET /api/admin/events (admin events money list).
// Only `from` and `to` are forwarded, and only when they are an ISO date-time with Z or an offset.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";
import { notSignedIn } from "./_lib";

const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!getTokenFromRequest(req)) return notSignedIn();
  const qs = new URLSearchParams();
  for (const key of ["from", "to"] as const) {
    const v = req.nextUrl.searchParams.get(key);
    if (v && ISO_WITH_ZONE.test(v) && !Number.isNaN(Date.parse(v))) qs.set(key, v);
  }
  const query = qs.toString();
  return proxyToBackend(`/api/admin/events${query ? `?${query}` : ""}`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
