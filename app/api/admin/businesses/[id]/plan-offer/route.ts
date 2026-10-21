// BFF for the admin "Offer plan" control on a business (hidden plan offers).
//   POST   { plan: "grandfathered" } | { plan: "free", expiresAt } | { plan: "free", permanent: true }
//          → backend POST   /api/admin/businesses/:id/plan-offer
//   DELETE (no body) → backend DELETE /api/admin/businesses/:id/plan-offer (withdraw)
// Real authorization is the backend's requireAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ id: string }> };

const NOT_AUTHENTICATED = { error: "Not authenticated" };

export async function POST(req: NextRequest, { params }: Ctx) {
  if (!getTokenFromRequest(req)) return NextResponse.json(NOT_AUTHENTICATED, { status: 401 });
  const { id } = await params;

  let raw: { plan?: unknown; expiresAt?: unknown; permanent?: unknown };
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  // Only the offer fields are forwarded; the backend validates them.
  const body = {
    plan: raw?.plan,
    ...(raw?.expiresAt !== undefined ? { expiresAt: raw.expiresAt } : {}),
    ...(raw?.permanent !== undefined ? { permanent: raw.permanent } : {}),
  };

  return proxyToBackend(`/api/admin/businesses/${encodeURIComponent(id)}/plan-offer`, {
    method: "POST",
    headers: backendAuthHeaders(req) as Record<string, string>,
    body,
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!getTokenFromRequest(req)) return NextResponse.json(NOT_AUTHENTICATED, { status: 401 });
  const { id } = await params;

  return proxyToBackend(`/api/admin/businesses/${encodeURIComponent(id)}/plan-offer`, {
    method: "DELETE",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
