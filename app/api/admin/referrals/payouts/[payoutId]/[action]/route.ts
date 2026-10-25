// POST /api/admin/referrals/payouts/:payoutId/:action → backend, for action pause | release | cancel | retry.
// Any other action is a 404 here. No body is forwarded; the backend enforces every state guard
// (409 PAYOUT_SENDING, NOT_PAUSABLE, NOT_PAUSED, NOT_CANCELLABLE, NOT_IN_REVIEW).

import { NextRequest, NextResponse } from "next/server";
import { forwardAdmin, notFound } from "../../../../events/_lib";
import { isAdminAction } from "@/app/admin/referrals/_lib/referrals";

type Ctx = { params: Promise<{ payoutId: string; action: string }> };

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const { payoutId, action } = await params;
  if (!isAdminAction(action)) return notFound();
  return forwardAdmin(req, {
    method: "POST",
    ids: [payoutId],
    path: ([i]) => `/api/admin/referrals/payouts/${encodeURIComponent(i)}/${action}`,
  });
}
