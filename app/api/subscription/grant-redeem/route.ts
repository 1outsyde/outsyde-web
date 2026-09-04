// app/api/subscription/grant-redeem/route.ts
// BFF proxy — validates a signed grant token with the backend.
// Forwards auth cookie or x-auth-token header, same pattern as checkout route.
//
// POST /api/subscription/grant-redeem   Body: { token }
// → proxies POST ${OUTSYDE_BACKEND_URL}/api/subscription/grant-link/redeem

import { NextRequest, NextResponse } from "next/server";

const TOKEN_COOKIE = "outsyde_access_token";

export async function POST(req: NextRequest) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const token =
    req.cookies.get(TOKEN_COOKIE)?.value ||
    req.headers.get("x-auth-token");
  if (!token) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const upstream = await fetch(
      `${backendUrl}/api/subscription/grant-link/redeem`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error("subscription/grant-redeem proxy error:", err);
    return NextResponse.json({ error: "Redemption failed. Please try again." }, { status: 502 });
  }
}
