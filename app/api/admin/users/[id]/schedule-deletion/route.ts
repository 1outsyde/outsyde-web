import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

// No request body; the backend handler reads only req.params.
// See outsyde-backend POST /api/admin/users/:userId/schedule-deletion for status codes.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/users/${id}/schedule-deletion`,
    { method: "POST", headers: backendAuthHeaders(req) }
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
