// POST /api/admin/events/payouts/:payoutId/retry → backend (moves a payout in review back to pending).
// No body is forwarded; the backend enforces the state guards (409 NOT_IN_REVIEW, EVENT_NOT_PUBLISHED).

import { NextRequest, NextResponse } from "next/server";
import { forwardAdmin } from "../../../_lib";

type Ctx = { params: Promise<{ payoutId: string }> };

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const { payoutId } = await params;
  return forwardAdmin(req, {
    method: "POST",
    ids: [payoutId],
    path: ([i]) => `/api/admin/events/payouts/${encodeURIComponent(i)}/retry`,
  });
}
