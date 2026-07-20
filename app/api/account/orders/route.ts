import { NextRequest, NextResponse } from "next/server";

function getToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") || "";
  return cookie.match(/outsyde_access_token=([^;]+)/)?.[1] ?? null;
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/my-orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}