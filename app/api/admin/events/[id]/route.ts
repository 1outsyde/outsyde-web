// GET /api/admin/events/:id → backend GET /api/admin/events/:id (admin event money detail).

import { NextRequest, NextResponse } from "next/server";
import { forwardAdmin } from "../_lib";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const { id } = await params;
  return forwardAdmin(req, { method: "GET", ids: [id], path: ([i]) => `/api/admin/events/${encodeURIComponent(i)}` });
}
