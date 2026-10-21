// GET /api/plan-offer → backend GET /api/vendor/plan-offer (the signed-in owner's pending hidden plan offer).
// Returns { offer: null } when there is none; 401 when signed out.

import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getVendorToken } from "@/lib/vendor-token";

export async function GET(req: NextRequest) {
  const token = getVendorToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return proxyToBackend("/api/vendor/plan-offer", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}
