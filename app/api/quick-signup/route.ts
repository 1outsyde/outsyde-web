// app/api/quick-signup/route.ts
// BFF for the quick sign up sheet on event pages (p4-quicksignup).
//
// Forwards { firstName, email, phone, password } to the backend's
// POST /api/auth/customer/quick-signup with the visitor's address (x-outsyde-client-ip) and,
// when OUTSYDE_PROXY_KEY is set, the shared key that lets the backend trust that address for its
// 60 per 15 minute limit. On success it signs the person in (outsyde_access_token cookie, same as
// /api/login) and returns { ok, email }; the token never goes to the browser.
// 400, 409 (EMAIL_EXISTS) and 429 bodies pass through unchanged.

import { NextResponse } from "next/server";
import { accessTokenCookie, clientIpFrom } from "@/lib/auth-cookie";

const UNREACHABLE = "Couldn’t reach the server. Please try again.";
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export async function POST(req: Request) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("quick-signup: OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server misconfigured. Please try again later." }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const clientIp = clientIpFrom(req.headers);
  if (clientIp) headers["x-outsyde-client-ip"] = clientIp;
  const proxyKey = process.env.OUTSYDE_PROXY_KEY;
  if (proxyKey) headers["x-outsyde-proxy-key"] = proxyKey;

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl}/api/auth/customer/quick-signup`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        firstName: str(body.firstName),
        email: str(body.email),
        phone: str(body.phone),
        password: str(body.password),
      }),
    });
  } catch (err) {
    console.error("quick-signup: upstream fetch failed", err);
    return NextResponse.json({ error: UNREACHABLE }, { status: 502 });
  }

  let data: Record<string, unknown> = {};
  try {
    data = await upstream.json();
  } catch {
    // handled below
  }

  if (!upstream.ok) {
    return NextResponse.json(data && typeof data === "object" ? data : { error: UNREACHABLE }, { status: upstream.status });
  }

  const accessToken = data?.accessToken;
  if (typeof accessToken !== "string" || !accessToken) {
    console.error("quick-signup: backend 200 without an access token");
    return NextResponse.json({ error: UNREACHABLE }, { status: 502 });
  }

  const user = (data?.user ?? null) as Record<string, unknown> | null;
  const email = typeof user?.email === "string" ? user.email : str(body.email)?.trim().toLowerCase() ?? "";
  const response = NextResponse.json({ ok: true, email });

  // Forward the backend's cookies, as /api/login does.
  const setCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : upstream.headers.get("set-cookie")
        ? [upstream.headers.get("set-cookie") as string]
        : [];
  for (const cookie of setCookies) response.headers.append("Set-Cookie", cookie);
  response.headers.append("Set-Cookie", accessTokenCookie(accessToken));
  return response;
}
