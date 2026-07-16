// app/api/auth/me/route.ts
// BFF proxy: outsyde-web -> outsyde-backend
//
// Calls GET /api/auth/me, forwarding whatever session cookie the browser
// sent us. Returns the backend's authoritative session state (or 401 if
// nobody's logged in) so the nav can reflect real login status instead of
// always showing "Log In" regardless of session.

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("auth/me: OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ authenticated: false, error: "Server misconfigured." }, { status: 500 });
  }

  const cookie = req.headers.get("cookie");

  let meRes: Response;
  try {
    meRes = await fetch(`${backendUrl}/api/auth/me`, {
      method: "GET",
      headers: cookie ? { Cookie: cookie } : {},
    });
  } catch (err) {
    console.error("auth/me: upstream fetch failed", err);
    return NextResponse.json({ authenticated: false, error: "Couldn\u2019t reach the server." }, { status: 502 });
  }

  let data: Record<string, unknown> = {};
  try {
    data = await meRes.json();
  } catch {
    // ignore — fall through with an empty object
  }

  return NextResponse.json(data, { status: meRes.status });
}