// app/api/auth/me/route.ts
// BFF proxy: outsyde-web -> outsyde-backend GET /api/auth/me
//
// Extracts outsyde_access_token from the browser cookie and forwards it as
// a Bearer token — consistent with all other BFF routes. Returns
// { authenticated: true, ...userData } on success, { authenticated: false }
// on 401/403, so callers can reliably check d.authenticated.

import { NextRequest, NextResponse } from "next/server";

function getToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") || "";
  return cookie.match(/outsyde_access_token=([^;]+)/)?.[1] ?? null;
}

export async function GET(req: NextRequest) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("auth/me: OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ authenticated: false, error: "Server misconfigured." }, { status: 500 });
  }

  const token = getToken(req);
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let meRes: Response;
  try {
    meRes = await fetch(`${backendUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.error("auth/me: upstream fetch failed", err);
    return NextResponse.json({ authenticated: false, error: "Couldn’t reach the server." }, { status: 502 });
  }

  let data: Record<string, unknown> = {};
  try {
    data = await meRes.json();
  } catch {
    // ignore — fall through with empty object
  }

  if (meRes.ok) {
    return NextResponse.json({ authenticated: true, ...data });
  }

  return NextResponse.json({ authenticated: false, ...data }, { status: meRes.status });
}
