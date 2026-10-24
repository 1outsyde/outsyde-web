// GET /api/admin/referrals → backend GET /api/admin/referrals (business and friend referrals, payouts, totals).
// Real authorization is the backend's requirePlatformAdmin; this only checks a token exists and forwards.

import { NextRequest, NextResponse } from "next/server";
import { forwardAdmin } from "../events/_lib";

export async function GET(req: NextRequest): Promise<NextResponse> {
  return forwardAdmin(req, { method: "GET", path: () => "/api/admin/referrals" });
}
