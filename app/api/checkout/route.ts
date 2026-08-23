// app/api/checkout/route.ts
// BFF proxy: outsyde-web -> outsyde-backend POST /api/cart/payment-intent
//
// Extracts the session token from the outsyde_access_token cookie and forwards
// it as a Bearer token. The backend handles all fee calculation, PI creation,
// and single vs multi-vendor routing — this route is intentionally thin.

import { NextRequest, NextResponse } from "next/server";

function getToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") || "";
  return cookie.match(/outsyde_access_token=([^;]+)/)?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("checkout: OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const token = getToken(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl}/api/cart/payment-intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("checkout: upstream fetch failed", err);
    return NextResponse.json({ error: "Could not reach payment server." }, { status: 502 });
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    data = {};
  }

  return NextResponse.json(data, { status: upstream.status });
}
