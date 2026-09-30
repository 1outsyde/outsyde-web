// BFF: revoke an unused admin free-plan claim link.
//   DELETE → backend DELETE /api/admin/subscription/complimentary-link/:id   ({ success: true } | 404 | 409)

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!getTokenFromRequest(req)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;

  // No req.json() here: a DELETE has no body.
  return proxyToBackend(`/api/admin/subscription/complimentary-link/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
