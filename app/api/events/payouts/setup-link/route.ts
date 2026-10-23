import { NextRequest } from "next/server";
import { forward } from "../../_lib/bff";

export async function POST(req: NextRequest) {
  // The web return flow is fixed; nothing from the client body is forwarded.
  return forward(req, "POST", "/api/events/payouts/setup-link", { web: true });
}
