import { NextRequest } from "next/server";
import { forward } from "../_lib/bff";

/** p4-team step 9d-2: the Event Team note and whether I accepted it (backend #403 teamNote.ts). */
export async function GET(req: NextRequest) {
  return forward(req, "GET", "/api/events/team-note");
}
