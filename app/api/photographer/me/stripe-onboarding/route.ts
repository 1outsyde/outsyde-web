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
      cookie: req.headers.get("cookie") ?? "",
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // Always a web return (webRedirect): Stripe comes back to goutsyde.com instead of the app's
    // outsyde:// link. Optional { returnTo: "finish" } from /finish returns to the setup checklist.
    let returnTo: string | undefined;
    try {
      const body = await req.json();
      if (body?.returnTo === "finish") returnTo = "finish";
    } catch {
      // no body (photographer dashboard)
    }

    const res = await fetch(`${BACKEND}/api/photographers/me/stripe-onboarding`, {
      method: "POST",
      headers,
      body: JSON.stringify({ webRedirect: true, ...(returnTo ? { returnTo } : {}) }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[photographer/me/stripe-onboarding] proxy error:", err);
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}
