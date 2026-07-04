// app/api/accept-invite/complete/route.ts
// BFF proxy — completes staff invite acceptance server-side.
// All outsyde-backend calls happen server-to-server; no credentials or cookies
// are ever set in the visitor's browser.
//
// POST /api/accept-invite/complete
// Body: { code, mode: "login"|"signup", email, password, name?, username? }
//
// signup path:
//   POST /api/auth/customer/signup  { email, password, name, username, inviteCode }
//   → if staffInviteAccepted === true  → { ok: true }
//   → if staffInviteAccepted === false → { ok: true, inviteNotLinked: true }
//   → 409 username conflict           → { error: msg, field: "username" }
//   → other non-2xx                   → forward backend error message
//
// login path:
//   POST /api/auth/login             { email, password }
//   → capture Set-Cookie from response
//   POST /api/staff/accept-invite    { inviteCode: code } + Cookie header
//   → forward result

import { NextResponse } from "next/server";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function POST(req: Request) {
  let body: {
    code?: unknown;
    mode?: unknown;
    email?: unknown;
    password?: unknown;
    name?: unknown;
    username?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { code, mode, email, password, name, username } = body;

  // --- input validation ---
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Missing invite code." }, { status: 400 });
  }
  if (mode !== "login" && mode !== "signup") {
    return NextResponse.json({ error: "mode must be 'login' or 'signup'." }, { status: 400 });
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 1) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }
  if (mode === "signup" && (typeof name !== "string" || !name.trim())) {
    return NextResponse.json({ error: "Full name is required to create an account." }, { status: 400 });
  }
  if (mode === "signup") {
    if (typeof username !== "string" || !username.trim()) {
      return NextResponse.json({ error: "Username is required.", field: "username" }, { status: 400 });
    }
    if (!USERNAME_RE.test(username.trim())) {
      return NextResponse.json(
        { error: "Username must be 3\u201320 lowercase letters, numbers, or underscores.", field: "username" },
        { status: 400 },
      );
    }
  }

  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    if (mode === "signup") {
      return await handleSignup({
        backendUrl,
        code: code.trim(),
        email: email.trim().toLowerCase(),
        password,
        name: (name as string).trim(),
        username: (username as string).trim().toLowerCase(),
      });
    } else {
      return await handleLogin({
        backendUrl,
        code: code.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
    }
  } catch (err) {
    console.error("accept-invite/complete: unexpected error", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Signup path
// ---------------------------------------------------------------------------
async function handleSignup({
  backendUrl,
  code,
  email,
  password,
  name,
  username,
}: {
  backendUrl: string;
  code: string;
  email: string;
  password: string;
  name: string;
  username: string;
}): Promise<NextResponse> {
  const signupRes = await fetch(`${backendUrl}/api/auth/customer/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, username, inviteCode: code }),
  });

  let signupData: Record<string, unknown>;
  try {
    signupData = await signupRes.json();
  } catch {
    return NextResponse.json(
      { error: "Unexpected response from server. Please try again." },
      { status: 502 },
    );
  }

  if (!signupRes.ok) {
    // Surface backend's error message verbatim — don't paraphrase.
    const msg =
      typeof signupData.error === "string"
        ? signupData.error
        : typeof signupData.message === "string"
          ? signupData.message
          : "Could not create account. Please try again.";
    // Tag username conflicts so the UI can show the error on the field, not generically.
    if (signupRes.status === 409) {
      return NextResponse.json({ error: msg, field: "username" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: signupRes.status });
  }

  // Account created — check whether the invite was auto-linked
  if (signupData.staffInviteAccepted === false) {
    return NextResponse.json({ ok: true, inviteNotLinked: true });
  }

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Login path — two-leg: login → capture cookie → accept-invite
// ---------------------------------------------------------------------------
async function handleLogin({
  backendUrl,
  code,
  email,
  password,
}: {
  backendUrl: string;
  code: string;
  email: string;
  password: string;
}): Promise<NextResponse> {
  // Leg 1: authenticate
  const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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
      typeof loginData.error === "string"
        ? loginData.error
        : typeof loginData.message === "string"
          ? loginData.message
          : "Invalid email or password.";
    return NextResponse.json({ error: msg }, { status: loginRes.status });
  }

  // Capture the session cookie the backend set — forward it on the next call
  const setCookieHeader = loginRes.headers.get("set-cookie");
  if (!setCookieHeader) {
    // Backend logged in but returned no session — can't chain the invite call
    return NextResponse.json(
      { error: "Login succeeded but no session was established. Please try again." },
      { status: 502 },
    );
  }

  // Extract the raw cookie value(s) to forward as a Cookie: header.
  // set-cookie may contain multiple directives (Path=/, HttpOnly, etc.) — strip them.
  const cookieValue = setCookieHeader
    .split(",")
    .map((part) => {
      // Each cookie string is "name=value; Directive; Directive"
      // We only want the "name=value" segment before the first semicolon
      return part.split(";")[0].trim();
    })
    .join("; ");

  // Leg 2: accept the invite using the authenticated session
  const acceptRes = await fetch(`${backendUrl}/api/staff/accept-invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieValue,
    },
    body: JSON.stringify({ inviteCode: code }),
  });

  let acceptData: Record<string, unknown>;
  try {
    acceptData = await acceptRes.json();
  } catch {
    return NextResponse.json(
      { error: "Unexpected response from server. Please try again." },
      { status: 502 },
    );
  }

  if (!acceptRes.ok) {
    const msg =
      typeof acceptData.error === "string"
        ? acceptData.error
        : typeof acceptData.message === "string"
          ? acceptData.message
          : "Could not accept the invite. Please try again.";
    return NextResponse.json({ error: msg }, { status: acceptRes.status });
  }

  return NextResponse.json({ ok: true });
}
