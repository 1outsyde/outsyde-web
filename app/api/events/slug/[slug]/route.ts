import { NextRequest } from "next/server";
import { cleanSlug, forward, notFound } from "../../_lib/bff";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const slug = cleanSlug((await params).slug);
  if (!slug) return notFound();
  return forward(req, "GET", `/api/events/slug/${slug}`);
}
