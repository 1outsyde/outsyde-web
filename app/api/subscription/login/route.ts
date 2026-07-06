// app/api/subscription/login/route.ts
// BFF proxy — logs a vendor in against outsyde-backend using the JWT-issuing
// mobile login endpoint, and stores the access token as a first-party,
// httpOnly cookie on this domain.
//
// Why /api/auth/mobile/login instead of /api/auth/login:
// The session-cookie login (/api/auth/login) depends on the backend's
// server-side session store staying alive between requests. In production
// that store can be process-memory-backed and gets wiped on a cold
// start/restart, which silently logs vendors back out mid-flow ("Not
// authenticated" when trying to change plans). The JWT from
// /api/auth/mobile/login is stateless and self-contained, so it isn't
// affected by backend restarts — it's also exactly what the native app
// already uses for authenticated calls, so this keeps web and app on the
// same auth mechanism instead of inventing a third one.
//
// POST /api/subscription/login   Body: { email, password }
// → POST ${OUTSYDE_BACKEND_URL}/api/auth/mobile/login
// → store returned accessToken in httpOnly cookie "outsyde_access_token"

import { NextResponse } from "next/server";

const TOKEN_COOKIE = "outsyde_access_token";

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

  const loginRes = await fetch(`${backendUrl}/api/auth/mobile/login`, {
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

  if (!loginRes.ok || !loginData.accessToken) {
    const msg =
      typeof (loginData as { error?: { message?: string } })?.error?.message === "string"
        ? (loginData as { error: { message: string } }).error.message
        : "Invalid email or password.";
    return NextResponse.json({ error: msg }, { status: loginRes.status || 401 });
  }

  const user = loginData.user as { isVendor?: boolean } | undefined;
  if (!user?.isVendor) {
    return NextResponse.json(
      { error: "This login is for business accounts. Manage your subscription from a vendor account." },
      { status: 403 },
    );
  }

  const expiresIn = typeof loginData.expiresIn === "number" ? loginData.expiresIn : 60 * 60 * 24 * 7;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(TOKEN_COOKIE, loginData.accessToken as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn,
  });
  return res;
}