// app/api/auth/logout/route.ts
// BFF proxy: outsyde-web -> outsyde-backend
//
// Calls POST /api/auth/logout, forwarding the browser's session cookie so
// the backend destroys the right session. Also explicitly clears the
// connect.sid cookie on our own response, so the browser drops it
// immediately rather than waiting on it to just become invalid.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("auth/logout: OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const cookie = req.headers.get("cookie");

  try {
    await fetch(`${backendUrl}/api/auth/logout`, {
      method: "POST",
      headers: cookie ? { Cookie: cookie } : {},
    });
  } catch (err) {
    // Don't block logout on a network hiccup — clear the local cookie
    // regardless, since that's what actually matters to the person.
    console.error("auth/logout: upstream fetch failed", err);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("connect.sid", "", { expires: new Date(0), path: "/" });
  return response;
}