// app/api/subscription/tiers/route.ts
// BFF proxy — fetches the live tier list (name, price, features) from
// outsyde-backend so this page never hardcodes prices that could drift from
// what the app shows.
//
// The list can differ per caller (the backend may include the caller's own
// plan, or the tier named by a signed grant link, on top of the public plans),
// so this route forwards the caller's auth and an optional ?grant= token and is
// never cached. Signed-out callers send no auth and get the public list.
//
// GET /api/subscription/tiers[?grant=<token>]
// → proxies GET ${OUTSYDE_BACKEND_URL}/api/subscription-tiers[?grant=<token>]
//
// Auth forwarding mirrors the checkout BFF: the outsyde_access_token cookie
// (via backendAuthHeaders), or an x-auth-token header from the app WebView.
// Neither the token nor the grant value is ever logged.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";

// Per-caller response — never statically cached or shared between users.
export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "private, no-store" };

function forwardedAuthHeaders(req: NextRequest): HeadersInit {
  if (getTokenFromRequest(req)) {
    return backendAuthHeaders(req);
  }
  const headerToken = req.headers.get("x-auth-token");
  return headerToken ? { Authorization: `Bearer ${headerToken}` } : {};
}

export async function GET(req: NextRequest) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500, headers: NO_STORE });
  }

  const grant = req.nextUrl.searchParams.get("grant");
  const query = grant ? `?grant=${encodeURIComponent(grant)}` : "";

  try {
    const res = await fetch(`${backendUrl}/api/subscription-tiers${query}`, {
      headers: forwardedAuthHeaders(req),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to load plans." },
        { status: res.status, headers: NO_STORE },
      );
    }
    return NextResponse.json(data, { headers: NO_STORE });
  } catch (err) {
    // Message only — never the request URL, headers or grant value.
    console.error("subscription/tiers proxy error:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "Failed to load plans." }, { status: 502, headers: NO_STORE });
  }
}
