// app/api/taxonomy/business-categories/route.ts
// Public BFF for the shared business industry list (backend GET /api/taxonomy/business-categories).
// Used by /business-signup. Cached at the edge for 5 minutes, same as the backend.

import { NextResponse } from "next/server";
import { isTaxonomy } from "@/lib/business-taxonomy";

export async function GET() {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  try {
    const res = await fetch(`${backendUrl}/api/taxonomy/business-categories`, { next: { revalidate: 300 } });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok || !isTaxonomy(data)) {
      return NextResponse.json({ error: "Could not load business categories." }, { status: 502 });
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return NextResponse.json({ error: "Could not load business categories." }, { status: 502 });
  }
}
