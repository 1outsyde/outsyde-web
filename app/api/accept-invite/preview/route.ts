// app/api/accept-invite/preview/route.ts
// BFF proxy — fetches invite preview from outsyde-backend server-side so
// OUTSYDE_BACKEND_URL is never exposed to the browser.
//
// GET /api/accept-invite/preview?code=XXXX
//   → proxies GET ${OUTSYDE_BACKEND_URL}/api/staff/invites/:code
//   → passes through the backend's status code and JSON body as-is

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();

  if (!code) {
    return NextResponse.json({ error: "Missing invite code." }, { status: 400 });
  }

  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const upstream = await fetch(`${backendUrl}/api/staff/invites/${encodeURIComponent(code)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      // No credentials — this is a public preview endpoint on the backend
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error("accept-invite/preview: upstream fetch failed", err);
    return NextResponse.json({ error: "Could not reach the server. Please try again." }, { status: 502 });
  }
}
