import { NextRequest } from "next/server";
import { forward, notFound } from "../../_lib/bff";
import { cleanCode } from "../../../../events/_host/teamLinksLogic";

type Ctx = { params: Promise<{ code: string }> };

/**
 * p4-team step 9-0: the public invite link page (goutsyde.com/team/CODE). Signed out works; when signed in the cookie
 * goes along so the backend can say whether it's theirs or the host's. Anything that isn't a code never reaches it.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const code = cleanCode((await params).code);
  if (!code) return notFound();
  return forward(req, "GET", `/api/events/team-links/${code}`);
}
