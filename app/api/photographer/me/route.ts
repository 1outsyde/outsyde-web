import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.OUTSYDE_BACKEND_URL!;

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/outsyde_access_token=([^;]+)/);
  return match ? match[1] : null;
}

function buildHeaders(req: NextRequest, extra?: Record<string, string>): Record<string, string> {
  const token = getAccessToken(req);
  const headers: Record<string, string> = {
    cookie: req.headers.get("cookie") ?? "",
    ...extra,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND}/api/photographers/me`, {
      headers: buildHeaders(req),
    });
    const data = await res.json();
    console.log("[PHOTOGRAPHER ME]", JSON.stringify(data));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[photographer/me] GET proxy error:", err);
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/api/photographers/me`, {
      method: "PATCH",
      headers: buildHeaders(req, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[photographer/me] PATCH proxy error:", err);
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}
