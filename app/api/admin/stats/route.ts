import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const res = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/admin/stats`, {
    headers: backendAuthHeaders(req),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}