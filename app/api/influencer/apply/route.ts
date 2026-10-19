// POST /api/influencer/apply → backend POST /api/influencer/apply (signed-in customers).
// Body: every application answer (2026-10-18). Errors come back as { error, field }.

import { NextRequest } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return proxyToBackend("/api/influencer/apply", {
    method: "POST",
    headers: backendAuthHeaders(req) as Record<string, string>,
    body,
  });
}
