import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

// The backend reads no query params and returns a BARE ARRAY of every
// photographer regardless of visibility — no wrapper, no total, no
// pagination. Filtering and search are client-side.
export async function GET(req: NextRequest) {
  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/photographers`,
    { headers: backendAuthHeaders(req) }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
