// Public: GET|POST /api/broadcasts/unsubscribe?u=&s= → backend /api/broadcasts/unsubscribe (no sign in, signed link).
// Lets the unsubscribe links in our emails use www.goutsyde.com. See lib/unsubscribe-relay.ts.

import { NextRequest } from "next/server";
import { relayUnsubscribe } from "@/lib/unsubscribe-relay";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return relayUnsubscribe(req, "/api/broadcasts/unsubscribe");
}

// RFC 8058 one click: Gmail and Yahoo POST here from the List-Unsubscribe header.
export async function POST(req: NextRequest) {
  return relayUnsubscribe(req, "/api/broadcasts/unsubscribe");
}
