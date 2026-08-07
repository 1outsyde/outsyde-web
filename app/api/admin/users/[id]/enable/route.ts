import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

// No request body — the backend handler reads only req.params.
// There is no admin guard on enable, by design: re-enabling is always allowed.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/users/${id}/enable`,
    { method: "POST", headers: backendAuthHeaders(req) }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
