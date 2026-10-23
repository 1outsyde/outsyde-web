import { NextRequest } from "next/server";
import { forward } from "../_lib/bff";

export async function GET(req: NextRequest) {
  return forward(req, "GET", "/api/events/mine");
}
