// app/api/account/points/redeem/route.ts
// BFF proxy: outsyde-web -> outsyde-backend POST /api/points/redeem
// Turns points into a single-use code. Returns { success, codeId, code, discountCents, ... }.

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });

  const cookie = req.headers.get("cookie") || "";
  const token = cookie.match(/outsyde_access_token=([^;]+)/)?.[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { pointsToRedeem?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const pointsToRedeem = Number(body?.pointsToRedeem);
  if (!Number.isInteger(pointsToRedeem) || pointsToRedeem <= 0) {
    return NextResponse.json({ error: "Pick how many points to use." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl}/api/points/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pointsToRedeem }),
    });
  } catch (err) {
    console.error("points/redeem: upstream fetch failed", err);
    return NextResponse.json({ error: "Could not reach server." }, { status: 502 });
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    data = {};
  }
  return NextResponse.json(data, { status: upstream.status });
}
