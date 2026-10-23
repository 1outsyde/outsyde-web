import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../../../_lib/bff";

/** Host refund of one order on their event. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; orderId: string }> }) {
  const { id, orderId } = await params;
  if (!isUuid(id) || !isUuid(orderId)) return notFound();
  return forward(req, "POST", `/api/events/${id}/orders/${orderId}/refund`);
}
