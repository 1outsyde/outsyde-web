import { NextRequest } from "next/server";
import { forward, isUuid, notFound } from "../../_lib/bff";

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!isUuid(orderId)) return notFound();
  return forward(req, "GET", `/api/events/orders/${orderId}`);
}
