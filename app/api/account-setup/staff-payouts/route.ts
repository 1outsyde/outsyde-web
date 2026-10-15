// app/api/account-setup/staff-payouts/route.ts
// BFF proxy: POST /api/account-setup/staff-payouts { businessId? }
//   → POST ${OUTSYDE_BACKEND_URL}/api/staff/stripe-onboarding/create-link { returnTo: "finish", businessId? }
//   → { url } — Stripe onboarding for a staff member, returning to goutsyde.com/finish.
//
// A person on staff at more than one business gets 409 { error, businesses: [{ businessId,
// staffId, displayName }] } from the backend; that is passed through so /finish can ask which one.

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("account-setup/staff-payouts: OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server misconfigured. Please try again later." }, { status: 500 });
  }

  const token = req.cookies.get("outsyde_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Please sign in.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  let businessId: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.businessId === "string" && body.businessId) businessId = body.businessId;
  } catch {
    // no body is fine
  }

  try {
    const upstream = await fetch(`${backendUrl}/api/staff/stripe-onboarding/create-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ returnTo: "finish", ...(businessId ? { businessId } : {}) }),
    });
    const data = (await upstream.json().catch(() => ({}))) as {
      url?: string;
      error?: string | { message?: string };
      businesses?: unknown;
    };
    if (upstream.ok && typeof data.url === "string") {
      return NextResponse.json({ url: data.url });
    }
    const message =
      typeof data.error === "string" ? data.error : data.error?.message || "Couldn’t start Stripe. Please try again.";
    return NextResponse.json(
      { error: message, ...(Array.isArray(data.businesses) ? { businesses: data.businesses } : {}) },
      { status: upstream.ok ? 502 : upstream.status },
    );
  } catch (err) {
    console.error("account-setup/staff-payouts: upstream fetch failed", err);
    return NextResponse.json({ error: "Couldn’t reach the server. Please try again." }, { status: 502 });
  }
}
