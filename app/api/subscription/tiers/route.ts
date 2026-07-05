// app/api/subscription/tiers/route.ts
// BFF proxy — public endpoint, no auth required. Fetches the live tier
// list (name, price, features) from outsyde-backend so this page never
// hardcodes prices that could drift from what the app shows.
//
// GET /api/subscription/tiers
// → proxies GET ${OUTSYDE_BACKEND_URL}/api/subscription-tiers

import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const res = await fetch(`${backendUrl}/api/subscription-tiers`, {
      // Tiers change rarely — avoid hammering the backend on every page load.
      next: { revalidate: 60 },
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to load plans." },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("subscription/tiers proxy error:", err);
    return NextResponse.json({ error: "Failed to load plans." }, { status: 502 });
  }
}
