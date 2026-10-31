import { NextRequest } from "next/server";
import { forward, notFound } from "../../../_lib/bff";
import { cleanCode } from "../../../../../events/_host/teamLinksLogic";

type Ctx = { params: Promise<{ code: string }> };

/** p4-team step 9-0: take the spot (signed in; 401 makes the page open quick sign up). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const code = cleanCode((await params).code);
  if (!code) return notFound();
  return forward(req, "POST", `/api/events/team-links/${code}/accept`, {});
}
