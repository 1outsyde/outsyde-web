// BFF for the admin "free plan" controls on a business.
//   POST   { expiresAt } | { permanent: true }  → backend POST   /api/admin/businesses/:id/complimentary-subscription
//   DELETE (no body)                            → backend DELETE /api/admin/businesses/:id/complimentary-subscription
// Real authorization is the backend's requireAdmin; this route only forwards the caller's token.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ id: string }> };

const NOT_AUTHENTICATED = { error: "Not authenticated" };

export async function POST(req: NextRequest, { params }: Ctx) {
  if (!getTokenFromRequest(req)) return NextResponse.json(NOT_AUTHENTICATED, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  return proxyToBackend(`/api/admin/businesses/${encodeURIComponent(id)}/complimentary-subscription`, {
    method: "POST",
    headers: backendAuthHeaders(req) as Record<string, string>,
    body,
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!getTokenFromRequest(req)) return NextResponse.json(NOT_AUTHENTICATED, { status: 401 });
  const { id } = await params;

  // No req.json() here: a DELETE has no body.
  return proxyToBackend(`/api/admin/businesses/${encodeURIComponent(id)}/complimentary-subscription`, {
    method: "DELETE",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
