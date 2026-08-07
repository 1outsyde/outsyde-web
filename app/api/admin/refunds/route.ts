import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

// No status query param: the backend hardcodes status='pending' in
// getAllPendingRefundRequests and accepts no filter. There is no history view.
export async function GET(req: NextRequest) {
  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/refund-requests`,
    { headers: backendAuthHeaders(req) }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
