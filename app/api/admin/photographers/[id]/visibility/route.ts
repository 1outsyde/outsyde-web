import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

// Body: { visibilityStatus: "public" | "hidden" | "flagged", adminNotes?: string }
//
// visibilityStatus is validated backend-side (400 on anything else).
// adminNotes is NOT validated, and an empty string preserves the existing
// note rather than clearing it — this build never sends it.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/photographers/${id}/visibility`,
    {
      method: "PATCH",
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
