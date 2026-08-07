import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") || "pending";
  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/applications?status=${encodeURIComponent(status)}`,
    { headers: backendAuthHeaders(req) }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
