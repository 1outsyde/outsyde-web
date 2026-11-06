import { NextRequest } from "next/server";
import { badRequest, forward, invalidBody, isUuid, notFound, readBody } from "../../_lib/bff";

// Deliverables D3 (Legend 2026-11-06): the customer adds or changes the delivery address of a Delivery quote before
// paying. Only { address } is forwarded; the backend checks it (customer only, open quotes, one line, 5 to 300).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readBody(req);
  if (!body) return invalidBody();
  if (typeof body.address !== "string" || !body.address.trim()) return badRequest("ADDRESS_NEEDED", "Enter the delivery address.");
  return forward(req, "POST", `/api/quotes/${id}/delivery-address`, { address: body.address.slice(0, 600) });
}
