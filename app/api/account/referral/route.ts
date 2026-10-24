import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

// Friend invite card on /account/points (2026-10-23): the signed-in customer's code, share link and
// counts from GET /api/referral/code. Same cookie as /api/account/points.
export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  const token = cookie.match(/outsyde_access_token=([^;]+)/)?.[1];
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return proxyToBackend("/api/referral/code", { method: "GET", headers: { Authorization: `Bearer ${token}` } });
}
