// POST /api/admin/events/:id/reports/dismiss  { reason } → backend (p5-safety). Closes the event's pending reports.

import { NextRequest, NextResponse } from "next/server";
import { forwardEventModeration } from "../../../_lib";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  return forwardEventModeration(req, (await params).id, "reports/dismiss");
}
