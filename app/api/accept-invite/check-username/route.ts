// app/api/accept-invite/check-username/route.ts
// BFF proxy — checks username availability server-side so OUTSYDE_BACKEND_URL
// is never exposed to the browser.
//
// GET /api/accept-invite/check-username?username=foo
//   → proxies GET ${OUTSYDE_BACKEND_URL}/api/users/check-username/:username
//   → returns { available: boolean }
//
// Called on-blur from the signup form; rate-limited on the backend (20 req/min).

import { NextResponse } from "next/server";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.trim() ?? "";

  if (!username) {
    return NextResponse.json({ error: "Missing username." }, { status: 400 });
  }

  // Validate format here too — avoids a pointless upstream call for clearly
  // invalid values that would never be accepted anyway.
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "Invalid username format." }, { status: 400 });
  }

  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const upstream = await fetch(
      `${backendUrl}/api/users/check-username/${encodeURIComponent(username)}`,
      { method: "GET" },
    );
    const data = await upstream.json();
    // Pass through { available: boolean } — or whatever the backend returns
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error("accept-invite/check-username: upstream fetch failed", err);
    return NextResponse.json({ error: "Could not check username. Please try again." }, { status: 502 });
  }
}
