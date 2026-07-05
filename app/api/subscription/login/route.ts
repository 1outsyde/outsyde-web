// app/api/subscription/login/route.ts
// BFF proxy — logs a vendor in against outsyde-backend and re-issues its
// session cookie as a first-party, httpOnly cookie on this domain.
//
// Why: /api/stripe/checkout/tier-subscription on the backend accepts EITHER
// a JWT Bearer token OR an express-session cookie (req.session.userId).
// We don't have a JWT flow on the web yet, so we ride the session-cookie
// path — same one outsyde-backend already uses for its own dashboard.
//
// POST /api/subscription/login   Body: { email, password }
// → POST ${OUTSYDE_BACKEND_URL}/api/auth/login
// → capture Set-Cookie (connect.sid=...)
// → store it in our own httpOnly cookie "outsyde_backend_session"
// → return { ok: true, business } so the page can confirm which business
//   is about to subscribe (never trust localStorage/client state for this)

import { NextResponse } from "next/server";

const SESSION_COOKIE = "outsyde_backend_session";

export async function POST(req: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = body;
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 1) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  let loginData: Record<string, unknown>;
  try {
    loginData = await loginRes.json();
  } catch {
    return NextResponse.json(
      { error: "Unexpected response from server. Please try again." },
      { status: 502 },
    );
  }

  if (!loginRes.ok) {
    const msg =
      typeof loginData.message === "string"
        ? loginData.message
        : typeof loginData.error === "string"
          ? loginData.error
          : "Invalid email or password.";
    return NextResponse.json({ error: msg }, { status: loginRes.status });
  }

  const user = loginData.user as { isVendor?: boolean } | undefined;
  if (!user?.isVendor) {
    return NextResponse.json(
      { error: "This login is for business accounts. Manage your subscription from a vendor account." },
      { status: 403 },
    );
  }

  const setCookieHeader = loginRes.headers.get("set-cookie");
  if (!setCookieHeader) {
    return NextResponse.json(
      { error: "Login succeeded but no session was established. Please try again." },
      { status: 502 },
    );
  }

  // set-cookie can bundle multiple "name=value; Directive" segments — keep
  // just the "name=value" pairs to store and later replay as our own Cookie header.
  const cookieValue = setCookieHeader
    .split(",")
    .map((part) => part.split(";")[0].trim())
    .join("; ");

  const res = NextResponse.json({ ok: true, business: loginData.business ?? null });
  res.cookies.set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days, matches the backend's session TTL
  });
  return res;
}
