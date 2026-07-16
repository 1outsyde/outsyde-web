// app/api/login/route.ts
// BFF proxy: outsyde-web -> outsyde-backend
//
// Calls POST /api/auth/mobile/login. Despite the "mobile" name, this
// endpoint establishes a real session cookie for every login (see the
// backend's own comment: "CRITICAL: Establish session for ALL user types").
// We also store the returned accessToken in a cookie so JWT-only endpoints
// (stats, bookings, products, services) can be called from the web.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("login: OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server misconfigured. Please try again later." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { identifier, password } = (body ?? {}) as { identifier?: unknown; password?: unknown };
  if (typeof identifier !== "string" || !identifier.trim()) {
    return NextResponse.json({ error: "Email or username is required." }, { status: 400 });
  }
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  let loginRes: Response;
  try {
    loginRes = await fetch(`${backendUrl}/api/auth/mobile/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });
  } catch (err) {
    console.error("login: upstream fetch failed", err);
    return NextResponse.json({ error: "Couldn\u2019t reach the server. Please try again." }, { status: 502 });
  }

  let loginData: Record<string, unknown> = {};
  try {
    loginData = await loginRes.json();
  } catch {
    // ignore — handled by !loginRes.ok below
  }

  if (!loginRes.ok) {
    const errorObj = loginData?.error as { message?: string } | undefined;
    const msg =
      (typeof errorObj?.message === "string" && errorObj.message) ||
      "Invalid email/username or password.";
    return NextResponse.json({ error: msg }, { status: loginRes.status });
  }

  const user = (loginData?.user ?? null) as Record<string, unknown> | null;
  const accessToken = loginData?.accessToken as string | undefined;

  const response = NextResponse.json({
    ok: true,
    isVendor: user?.isVendor ?? false,
  });

  // Forward session cookie from backend
  const setCookies =
    typeof loginRes.headers.getSetCookie === "function"
      ? loginRes.headers.getSetCookie()
      : loginRes.headers.get("set-cookie")
        ? [loginRes.headers.get("set-cookie") as string]
        : [];
  for (const cookie of setCookies) {
    response.headers.append("Set-Cookie", cookie);
  }

  // Store accessToken in a cookie so BFF routes can forward it to JWT-only endpoints
  if (accessToken) {
    response.headers.append(
      "Set-Cookie",
      `outsyde_access_token=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900`
    );
  }

  return response;
}