import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let token: string, email: string, newPassword: string;
  try {
    const body = await req.json();
    token = body?.token ?? "";
    email = body?.email ?? "";
    newPassword = body?.newPassword ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email, newPassword }),
    });
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const data = await backendRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: backendRes.status });
}
