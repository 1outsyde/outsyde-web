import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie") || "";
  const token = cookie.match(/outsyde_access_token=([^;]+)/)?.[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const endpoint = type === "history" ? "/api/points/history" : "/api/points/balance";

  const res = await fetch(`${process.env.OUTSYDE_BACKEND_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Cookie: cookie, // forward session cookie too
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}