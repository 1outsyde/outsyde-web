import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

// Backend body: { notes: string } — REQUIRED. The backend returns 400
// "Rejection reason is required" if it is missing or falsy, and emails the
// value verbatim to the applicant.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/applications/${id}/reject`,
    {
      method: "POST",
      headers: {
        ...backendAuthHeaders(req),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
