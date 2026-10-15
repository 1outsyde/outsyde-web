// app/api/account-setup/send-code/route.ts
// BFF proxy: POST /api/account-setup/send-code { email }
//   → POST ${OUTSYDE_BACKEND_URL}/api/account-setup/send-code
//
// Emails a 6-digit code to an account that exists but has no password yet (used by /claim).
// The backend answers 200 for every email, so this never reveals whether an account exists.
// Only a rate-limit (429) is passed through, so the page can say "try again later".

import { NextResponse } from "next/server";

const OK = { success: true, message: "If that account needs setting up, we emailed a 6-digit code." };

export async function POST(req: Request) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("account-setup/send-code: OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server misconfigured. Please try again later." }, { status: 500 });
  }

  let email = "";
  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter the email on your account." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${backendUrl}/api/account-setup/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (upstream.status === 429) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes and try again.", code: "RATE_LIMITED" },
        { status: 429 },
      );
    }
  } catch (err) {
    console.error("account-setup/send-code: upstream fetch failed", err);
    return NextResponse.json({ error: "Couldn’t reach the server. Please try again." }, { status: 502 });
  }

  return NextResponse.json(OK);
}
