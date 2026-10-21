// POST /api/subscription/reconcile { sessionId } → backend POST /api/vendor/subscription/reconcile.
// The success page asks the backend to check the Stripe checkout and activate the plan now if Stripe's
// webhook hasn't landed yet. Only sessionId is forwarded.

import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getVendorToken } from "@/lib/vendor-token";

export async function POST(req: NextRequest) {
  const token = getVendorToken(req);
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.sessionId !== "string" || !/^cs_[A-Za-z0-9_]+$/.test(body.sessionId)) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  return proxyToBackend("/api/vendor/subscription/reconcile", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { sessionId: body.sessionId },
  });
}
