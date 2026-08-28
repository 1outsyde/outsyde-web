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
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const backendRes = await fetch(`${BACKEND}/api/photographers/me/stripe-onboarding`, {
      method: "POST",
      headers,
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}
