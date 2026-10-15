// app/api/account-setup/status/route.ts
// BFF proxy: GET /api/account-setup/status
//   → GET ${OUTSYDE_BACKEND_URL}/api/account-setup/status (Bearer from the outsyde_access_token cookie)
//   → { role, complete, next, steps: [{ key, state, label }] }
//
// The same checklist the app and the reminder emails use. Asking for it also lets the backend
// re-check Stripe, so coming back from Stripe onboarding shows the step as done.

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("account-setup/status: OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server misconfigured. Please try again later." }, { status: 500 });
  }

  const token = req.cookies.get("outsyde_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Please sign in.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${backendUrl}/api/account-setup/status`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown> & {
      error?: { code?: string; message?: string };
    };
    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || "Couldn’t load your setup steps.",
          code: data.error?.code || (upstream.status === 401 ? "AUTH_REQUIRED" : "SERVER_ERROR"),
        },
        { status: upstream.status },
      );
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("account-setup/status: upstream fetch failed", err);
    return NextResponse.json({ error: "Couldn’t reach the server. Please try again." }, { status: 502 });
  }
}
