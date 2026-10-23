// POST /api/admin/events/payouts/:payoutId/email-host → backend (one reminder email to the host).
// No body is forwarded; the backend enforces the cooldown (429) and the daily budget (503).

import { NextRequest, NextResponse } from "next/server";
import { forwardAdmin } from "../../../_lib";

type Ctx = { params: Promise<{ payoutId: string }> };

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const { payoutId } = await params;
  return forwardAdmin(req, {
    method: "POST",
    ids: [payoutId],
    path: ([i]) => `/api/admin/events/payouts/${encodeURIComponent(i)}/email-host`,
  });
}
