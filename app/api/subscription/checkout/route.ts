// app/api/subscription/checkout/route.ts
// BFF proxy — starts (or changes) the vendor's Stripe subscription.
// Requires the "outsyde_backend_session" cookie set by /api/subscription/login.
//
// POST /api/subscription/checkout   Body: { tierId }
// → proxies POST ${OUTSYDE_BACKEND_URL}/api/stripe/checkout/tier-subscription
//   with the stored backend session forwarded as a Cookie header
// → NOT sending `native: true` and NOT sending x-platform: mobile, so the
//   backend takes the web branch and returns a Stripe Checkout `url` to
//   redirect to, rather than a client secret for native payment sheets.
//
// NOTE: the backend currently hardcodes its post-checkout redirect to
// `${FRONTEND_URL}/vendor/dashboard?subscription=...`. If you want Stripe to
// land people back on outsyde-web instead of the backend's own dashboard,
// that redirect needs to become a parameter on the backend route — flagging
// this rather than silently changing shared backend behavior.

import { NextResponse } from "next/server";

const SESSION_COOKIE = "outsyde_backend_session";

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    if (trimmed.slice(0, idx) === name) return trimmed.slice(idx + 1);
  }
  return undefined;
}

export async function POST(req: Request) {
  let body: { tierId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { tierId } = body;
  if (typeof tierId !== "string" || !tierId.trim()) {
    return NextResponse.json({ error: "tierId is required." }, { status: 400 });
  }

  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const cookieValue = readCookie(req, SESSION_COOKIE);
  if (!cookieValue) {
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
        Cookie: cookieValue,
      },
      body: JSON.stringify({ tierId }),
    });

    const data = await checkoutRes.json();

    if (!checkoutRes.ok || !data.success) {
      const msg = data?.error?.message || "Could not start checkout. Please try again.";
      return NextResponse.json({ error: msg }, { status: checkoutRes.status || 500 });
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
