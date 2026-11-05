import { NextRequest } from "next/server";
import { forward, isLinkCode, notFound } from "../../_lib/bff";

// Quote link (goutsyde.com/q/<code>): a preview signed out, the quote id for the customer, the business or admin.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isLinkCode(code)) return notFound();
  return forward(req, "GET", `/api/quotes/link/${code}`);
}
