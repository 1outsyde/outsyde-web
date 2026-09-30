// BFF for admin free-plan claim links.
//   POST { businessId, expiresAt | permanent: true } → backend POST /api/admin/subscription/complimentary-link
//   GET  ?businessId=                                → backend GET  /api/admin/subscription/complimentary-links
// The create response carries the claim URL (it contains the token): it is relayed to the admin
// and never logged here.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

const NOT_AUTHENTICATED = { error: "Not authenticated" };

export async function POST(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json(NOT_AUTHENTICATED, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  return proxyToBackend("/api/admin/subscription/complimentary-link", {
    method: "POST",
    headers: backendAuthHeaders(req) as Record<string, string>,
    body,
  });
}

export async function GET(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json(NOT_AUTHENTICATED, { status: 401 });

  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId || !businessId.trim()) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  return proxyToBackend(
    `/api/admin/subscription/complimentary-links?businessId=${encodeURIComponent(businessId.trim())}`,
    { method: "GET", headers: backendAuthHeaders(req) as Record<string, string> },
  );
}
