// app/api/account-setup/claim/route.ts
// BFF proxy: POST /api/account-setup/claim { email, resetToken, newPassword, username? }
//   → POST ${OUTSYDE_BACKEND_URL}/api/account-setup/claim
//
// On success the backend returns the same shape as a login, so this signs the person in exactly
// like app/api/login/route.ts does: forwards the backend's cookies and stores the accessToken in
// the outsyde_access_token cookie. The tokens themselves never reach the browser's JS.
//
// Errors come back as { error, code, reason? } — codes: INVALID_TOKEN, ALREADY_CLAIMED,
// INVALID_PASSWORD, USERNAME_REQUIRED, INVALID_USERNAME, USERNAME_TAKEN, RATE_LIMITED.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("account-setup/claim: OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server misconfigured. Please try again later." }, { status: 500 });
  }

  let body: { email?: unknown; resetToken?: unknown; newPassword?: unknown; username?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const resetToken = typeof body.resetToken === "string" ? body.resetToken : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const username =
    typeof body.username === "string" && body.username.trim()
      ? body.username.trim().replace(/^@/, "").toLowerCase()
      : undefined;

  if (!email || !resetToken) {
    return NextResponse.json({ error: "This link or code has expired. Request a new code.", code: "INVALID_TOKEN" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters.", code: "INVALID_PASSWORD" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl}/api/account-setup/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, resetToken, newPassword, ...(username ? { username } : {}) }),
    });
  } catch (err) {
    console.error("account-setup/claim: upstream fetch failed", err);
    return NextResponse.json({ error: "Couldn’t reach the server. Please try again." }, { status: 502 });
  }

  const data = (await upstream.json().catch(() => ({}))) as {
    user?: { username?: string | null; isVendor?: boolean; isPhotographer?: boolean };
    accessToken?: string;
    error?: { code?: string; message?: string; reason?: string };
  };

  if (!upstream.ok) {
    return NextResponse.json(
      {
        error: data.error?.message || "Couldn’t finish your account. Please try again.",
        code: data.error?.code || (upstream.status === 429 ? "RATE_LIMITED" : "SERVER_ERROR"),
        ...(data.error?.reason ? { reason: data.error.reason } : {}),
      },
      { status: upstream.status },
    );
  }

  const response = NextResponse.json({
    ok: true,
    username: data.user?.username ?? null,
    isVendor: data.user?.isVendor ?? false,
    isPhotographer: data.user?.isPhotographer ?? false,
  });

  // Same sign-in as app/api/login/route.ts: forward the backend's cookies (session + refresh)...
  const setCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : upstream.headers.get("set-cookie")
        ? [upstream.headers.get("set-cookie") as string]
        : [];
  for (const cookie of setCookies) {
    response.headers.append("Set-Cookie", cookie);
  }

  // ...and keep the accessToken in an HttpOnly cookie for JWT-only BFF routes (7 days, like login).
  if (data.accessToken) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.append(
      "Set-Cookie",
      `outsyde_access_token=${data.accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`,
    );
  }

  return response;
}
