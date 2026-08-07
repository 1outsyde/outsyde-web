import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

// Backend body: { notes?: string } — optional on approve.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/applications/${id}/approve`,
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
