// app/api/subscription/billing/route.ts
// BFF proxy — opens the Stripe billing portal for the logged-in vendor.
// This works now that we're forwarding a Bearer token: the backend route
// (/api/stripe/billing-portal) is gated by authMiddleware, which requires a
// JWT and 401s before it would ever fall back to a session cookie — so this
// endpoint could never have worked with the old cookie-forwarding approach.
//
// POST /api/subscription/billing
// → proxies POST ${OUTSYDE_BACKEND_URL}/api/stripe/billing-portal

import { NextRequest, NextResponse } from "next/server";

const TOKEN_COOKIE = "outsyde_access_token";

export async function POST(req: NextRequest) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Please log in to your business account first." },
      { status: 401 },
    );
  }

  try {
    const portalRes = await fetch(`${backendUrl}/api/stripe/billing-portal`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await portalRes.json();

    if (!portalRes.ok || !data.portalUrl) {
      const msg = data?.message || data?.error || "Could not open billing portal.";
      return NextResponse.json({ error: msg }, { status: portalRes.status || 500 });
    }

    return NextResponse.json({ url: data.portalUrl });
  } catch (err) {
    console.error("subscription/billing proxy error:", err);
    return NextResponse.json({ error: "Could not open billing portal." }, { status: 502 });
  }
}
