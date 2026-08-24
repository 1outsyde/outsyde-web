import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = await req.json();
    email = body?.email ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  // Always 200 — prevents email enumeration regardless of backend outcome
  return NextResponse.json({ success: true, message: "If that email exists, a reset link has been sent." });
}
