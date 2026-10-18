import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.OUTSYDE_BACKEND_URL!;

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/outsyde_access_token=([^;]+)/);
  return match ? match[1] : null;
}

// Sets the signed in user's own businesses and photographer profile time zone, only where it is
// still empty. The dashboards never overwrite a time zone the owner already has.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const timeZone = typeof body?.timeZone === "string" ? body.timeZone.trim() : "";
    if (!timeZone || timeZone.length > 64) {
      return NextResponse.json({ error: "A valid time zone is required." }, { status: 400 });
    }

    const token = getAccessToken(req);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BACKEND}/api/me/time-zone`, {
      method: "POST",
      headers,
      body: JSON.stringify({ timeZone, overwrite: false }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[me/time-zone] proxy error:", err);
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}
