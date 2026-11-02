// GET /api/admin/events/reports?type=event|post → backend (p5-safety Reports tab). Only `type` is forwarded.

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";
import { notSignedIn } from "../_lib";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!getTokenFromRequest(req)) return notSignedIn();
  const type = req.nextUrl.searchParams.get("type") === "post" ? "post" : "event";
  return proxyToBackend(`/api/admin/events/reports?type=${type}`, {
    method: "GET",
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
