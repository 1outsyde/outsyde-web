// app/api/account-setup/verify-code/route.ts
// BFF proxy: POST /api/account-setup/verify-code { email, code }
//   → POST ${OUTSYDE_BACKEND_URL}/api/auth/forgot-password/verify-code (existing route, unchanged)
//   → { success: true, resetToken } on success; { error, code } otherwise
//
// The resetToken (15-minute, one use) is what /api/account-setup/claim consumes.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("account-setup/verify-code: OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server misconfigured. Please try again later." }, { status: 500 });
  }

  let email = "";
  let code = "";
  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!email || code.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit code from your email.", code: "INVALID_INPUT" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl}/api/auth/forgot-password/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
  } catch (err) {
    console.error("account-setup/verify-code: upstream fetch failed", err);
    return NextResponse.json({ error: "Couldn’t reach the server. Please try again." }, { status: 502 });
  }

  const data = (await upstream.json().catch(() => ({}))) as {
    success?: boolean;
    resetToken?: string;
    error?: { code?: string; message?: string };
  };

  if (upstream.ok && typeof data.resetToken === "string") {
    return NextResponse.json({ success: true, resetToken: data.resetToken });
  }
  if (upstream.status === 429) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again.", code: "RATE_LIMITED" },
      { status: 429 },
    );
  }
  return NextResponse.json(
    {
      error: data.error?.message || "That code didn’t work. Request a new one.",
      code: data.error?.code || "INVALID_CODE",
    },
    { status: upstream.ok ? 400 : upstream.status },
  );
}
