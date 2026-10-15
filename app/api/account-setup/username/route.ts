// app/api/account-setup/username/route.ts
// BFF proxy: POST /api/account-setup/username { username }
//   → POST ${OUTSYDE_BACKEND_URL}/api/account-setup/username (Bearer from the outsyde_access_token cookie)
//
// Sets a username only for accounts that don't have one yet. Errors come back as { error, code }:
// INVALID_USERNAME, USERNAME_TAKEN, ALREADY_SET, AUTH_REQUIRED, RATE_LIMITED.

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("account-setup/username: OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server misconfigured. Please try again later." }, { status: 500 });
  }

  const token = req.cookies.get("outsyde_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Please sign in.", code: "AUTH_REQUIRED" }, { status: 401 });
  }

  let username = "";
  try {
    const body = await req.json();
    username = typeof body?.username === "string" ? body.username.trim().replace(/^@/, "").toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!username) {
    return NextResponse.json({ error: "Pick a username.", code: "INVALID_USERNAME" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${backendUrl}/api/account-setup/username`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username }),
    });
    const data = (await upstream.json().catch(() => ({}))) as {
      username?: string;
      error?: { code?: string; message?: string };
    };
    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || "Couldn’t save your username.",
          code: data.error?.code || (upstream.status === 429 ? "RATE_LIMITED" : "SERVER_ERROR"),
        },
        { status: upstream.status },
      );
    }
    return NextResponse.json({ ok: true, username: data.username ?? username });
  } catch (err) {
    console.error("account-setup/username: upstream fetch failed", err);
    return NextResponse.json({ error: "Couldn’t reach the server. Please try again." }, { status: 502 });
  }
}
