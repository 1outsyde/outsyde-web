import { NextRequest } from "next/server";
import { forward } from "../_lib/bff";

/** Events I co-host (step 2b). */
export async function GET(req: NextRequest) {
  return forward(req, "GET", "/api/events/cohosting");
}
