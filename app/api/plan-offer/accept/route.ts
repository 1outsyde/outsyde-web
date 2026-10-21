// POST /api/plan-offer/accept { offerId, useCheckout? } → backend POST /api/vendor/plan-offer/accept.
// Only offerId and useCheckout are forwarded.

import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getVendorToken } from "@/lib/vendor-token";

export async function POST(req: NextRequest) {
  const token = getVendorToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { offerId?: unknown; useCheckout?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.offerId !== "string" || !body.offerId) {
    return NextResponse.json({ error: "offerId is required." }, { status: 400 });
  }

  return proxyToBackend("/api/vendor/plan-offer/accept", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { offerId: body.offerId, ...(body.useCheckout === true ? { useCheckout: true } : {}) },
  });
}
