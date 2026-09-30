// BFF: a business owner claims a free-plan link.
//   POST { token } → backend POST /api/subscription/complimentary-link/redeem
//   → { subscription, connectReady } | 404 NOT_FOUND | 410 LINK_UNAVAILABLE | 403 NO_BUSINESS /
//     WRONG_ACCOUNT | 409 { error } | 429 RATE_LIMITED
//
// Auth mirrors the checkout BFF: the outsyde_access_token cookie, or an x-auth-token header from
// the app WebView. Only `token` is forwarded (never any other field from the body), and the
// token is never logged.

import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: NextRequest) {
  const accessToken = getTokenFromRequest(req) ?? req.headers.get("x-auth-token");
  if (!accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  return proxyToBackend("/api/subscription/complimentary-link/redeem", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: { token: body?.token },
  });
}
