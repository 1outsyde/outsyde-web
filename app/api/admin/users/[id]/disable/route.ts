import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

// No request body — the backend handler reads only req.params.
// 403 => the target is an admin; admin accounts cannot be disabled.
// 404 => the user no longer exists.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/users/${id}/disable`,
    { method: "POST", headers: backendAuthHeaders(req) }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
