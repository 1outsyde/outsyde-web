import { NextRequest, NextResponse } from "next/server";
import { visitorHeaders } from "@/lib/auth-cookie";

export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = await req.json();
    email = body?.email ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...visitorHeaders(req.headers) },
      body: JSON.stringify({ email }),
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  // Too many reset requests: say so, instead of claiming a link was sent. This reveals nothing
  // about whether the email has an account (the backend limits every email the same way).
  if (upstream.status === 429) {
    const data = (await upstream.json().catch(() => ({}))) as { message?: unknown };
    const msg = typeof data.message === "string" && data.message ? data.message : "Too many requests. Please wait a few minutes and try again.";
    return NextResponse.json({ error: msg, code: "RATE_LIMITED" }, { status: 429 });
  }

  // Always 200 — prevents email enumeration regardless of backend outcome
  return NextResponse.json({ success: true, message: "If that email exists, a reset link has been sent." });
}
