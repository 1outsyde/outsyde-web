// POST /api/admin/events/:id/pause  { reason } → backend (p5-safety). Only the reason is forwarded.

import { NextRequest, NextResponse } from "next/server";
import { forwardEventModeration } from "../../_lib";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  return forwardEventModeration(req, (await params).id, "pause");
}
