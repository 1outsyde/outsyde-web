import { NextRequest } from "next/server";
import { forward } from "../../quotes/_lib/bff";

// Requests and quotes in My Activity: the customer's quotes.
export async function GET(req: NextRequest) {
  return forward(req, "GET", "/api/me/quotes");
}
