// app/api/subscription/status/route.ts
// BFF proxy — fetches the vendor's current subscription (which tier, status)
// so the web page can show "Current Plan" the same way the app does.
//
// GET /api/subscription/status
// → proxies GET ${OUTSYDE_BACKEND_URL}/api/vendor/subscription
//   with the stored access token forwarded as a Bearer header

import { NextRequest, NextResponse } from "next/server";

const TOKEN_COOKIE = "outsyde_access_token";

export async function GET(req: NextRequest) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const statusRes = await fetch(`${backendUrl}/api/vendor/subscription`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await statusRes.json();

    if (!statusRes.ok) {
      const msg = data?.error || "Could not load subscription status.";
      return NextResponse.json({ error: msg }, { status: statusRes.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("subscription/status proxy error:", err);
    return NextResponse.json({ error: "Could not load subscription status." }, { status: 502 });
  }
}
