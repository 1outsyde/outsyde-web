// app/api/subscription/checkout/route.ts
// BFF proxy — starts (or changes) the vendor's Stripe subscription.
// Requires the "outsyde_access_token" cookie set by /api/subscription/login,
// forwarded as a Bearer token (stateless — not dependent on backend session
// store staying warm).
//
// POST /api/subscription/checkout   Body: { tierId, grant? }   (grant = the ?grant= token of a
//   grandfathered grant link; forwarded only when it is a non-empty string, never logged)
// → proxies POST ${OUTSYDE_BACKEND_URL}/api/stripe/checkout/tier-subscription
// → omits `native`/`x-platform: mobile`, so the backend takes the web branch
//   and returns a Stripe Checkout `url` to redirect to.
//
// NOTE: the backend currently hardcodes its post-checkout redirect to
// `${FRONTEND_URL}/vendor/dashboard?subscription=...`. If you want Stripe to
// land people back on outsyde-web instead of the backend's own dashboard,
// that redirect needs to become a parameter on the backend route.

import { NextRequest, NextResponse } from "next/server";
import { buildCheckoutBody } from "@/lib/checkout-grant";
import { readJsonSafe, UNEXPECTED_RESPONSE_MESSAGE } from "@/lib/read-json-safe";

const TOKEN_COOKIE = "outsyde_access_token";

export async function POST(req: NextRequest) {
  let body: { tierId?: unknown; grant?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { tierId, grant } = body;
  if (typeof tierId !== "string" || !tierId.trim()) {
    return NextResponse.json({ error: "tierId is required." }, { status: 400 });
  }

  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const token =
  req.cookies.get(TOKEN_COOKIE)?.value ||
  req.headers.get('x-auth-token');
if (!token) {
  return NextResponse.json(
    { error: "Please log in to your business account first." },
    { status: 401 },
  );
}

  try {
    const checkoutRes = await fetch(`${backendUrl}/api/stripe/checkout/tier-subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(buildCheckoutBody(tierId, grant)),
    });

    // readJsonSafe never throws; it turns { error: { code, message } } into { error: "<message>", code }.
    const { status, data } = await readJsonSafe(checkoutRes);

    if (!checkoutRes.ok || !data.success) {
      const upstream = typeof data.error === "string" && data.error !== UNEXPECTED_RESPONSE_MESSAGE ? data.error : "";
      const msg = upstream || "Could not start checkout. Please try again.";
      return NextResponse.json(
        { error: msg, ...(typeof data.code === "string" ? { code: data.code } : {}) },
        { status: status || 500 },
      );
    }

    if (data.tierChanged) {
      return NextResponse.json({ tierChanged: true, newTier: data.newTier });
    }

    return NextResponse.json({ url: data.url });
  } catch (err) {
    console.error("subscription/checkout proxy error:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}