// app/api/subscription/set-token/route.ts
// Called by /subscription/manage when the mobile app passes a JWT in the URL.
// Exchanges the token for an httpOnly cookie on this domain so all subsequent
// /api/subscription/* calls can use cookie-based auth without exposing the JWT
// to JavaScript.
//
// POST /api/subscription/set-token   Body: { token: string }
// → sets outsyde_access_token as an httpOnly cookie and returns { ok: true }
//
// Security notes:
// - token is validated as a non-empty string only; JWT validity is enforced
//   by the backend on the next authenticated call
// - the cookie is httpOnly + SameSite=Lax + Secure in production, so it
//   cannot be read by JavaScript after being set

import { NextResponse } from "next/server";

const TOKEN_COOKIE = "outsyde_access_token";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days — matches subscription/login

export async function POST(req: Request) {
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { token } = body;
  if (typeof token !== "string" || token.trim().length < 10) {
    return NextResponse.json({ error: "A valid token is required." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(TOKEN_COOKIE, token.trim(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return res;
}
