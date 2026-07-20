import { NextRequest, NextResponse } from "next/server";

function getToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") || "";
  return cookie.match(/outsyde_access_token=([^;]+)/)?.[1] ?? null;
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const res = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}