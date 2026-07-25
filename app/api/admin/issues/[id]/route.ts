import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const res = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/admin/issues/${id}`, {
    method: "PATCH",
    headers: {
      ...backendAuthHeaders(req),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}