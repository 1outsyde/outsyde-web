// GET   /api/admin/influencers/[id] → backend GET /api/admin/influencers/:id (every answer, 2026-10-18)
// PATCH /api/admin/influencers/[id] → backend PATCH /api/admin/influencers/:id
//        body { status: "approved" | "rejected", admin_notes? }. Approve gives a promo code.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/api/admin/influencers/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { status?: unknown; admin_notes?: unknown } | null;
  const status = body?.status;
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "status must be approved or rejected" }, { status: 400 });
  }
  const notes = typeof body?.admin_notes === "string" ? body.admin_notes.trim() : "";
  return proxyToBackend(`/api/admin/influencers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: backendAuthHeaders(req) as Record<string, string>,
    body: { status, ...(notes ? { admin_notes: notes } : {}) },
  });
}
