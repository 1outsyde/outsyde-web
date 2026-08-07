import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

// Backend body: { status: "approved" | "rejected", adminNotes?: string }
//
// Status codes worth knowing at the call site:
//   402 — Stripe declined. The backend returns before any DB write, so no
//         money moved and the request is still pending.
//   400 — already processed (re-processing guard), or Zod validation.
//   500 — a step AFTER the Stripe refund failed. The refund may have been
//         issued; this is not a safe retry.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/refund-requests/${id}`,
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
