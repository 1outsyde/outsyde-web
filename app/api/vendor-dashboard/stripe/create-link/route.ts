import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.OUTSYDE_BACKEND_URL!;

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/outsyde_access_token=([^;]+)/);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
  try {
    const token = getAccessToken(req);
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const headers: Record<string, string> = {
      cookie: req.headers.get("cookie") ?? "",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const backendRes = await fetch(`${BACKEND}/api/vendor/stripe-onboarding/create-link`, {
      method: "POST",
      headers,
      body: JSON.stringify({ webRedirect: true }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}
