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

    // Optional { returnTo: "finish" } from goutsyde.com/finish: Stripe sends them back to the
    // setup checklist instead of the vendor dashboard. No body (vendor dashboard) = unchanged.
    let returnTo: string | undefined;
    try {
      const body = await req.json();
      if (body?.returnTo === "finish") returnTo = "finish";
    } catch {
      // no body
    }

    const backendRes = await fetch(`${BACKEND}/api/vendor/stripe-onboarding/create-link`, {
      method: "POST",
      headers,
      body: JSON.stringify({ webRedirect: true, ...(returnTo ? { returnTo } : {}) }),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}
