import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") || "open";
  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/issues?status=${encodeURIComponent(status)}`,
    { headers: backendAuthHeaders(req) }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/admin/issues`, {
    method: "POST",
    headers: {
      ...backendAuthHeaders(req),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}