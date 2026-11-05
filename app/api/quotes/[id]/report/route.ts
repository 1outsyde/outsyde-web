import { NextRequest } from "next/server";
import { forward, invalidBody, isUuid, notFound, readBody } from "../../_lib/bff";

// Report a problem. Body { reason, photos? } (photos uploaded first; the backend checks they are ours).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readBody(req);
  if (!body) return invalidBody();
  return forward(req, "POST", `/api/quotes/${id}/report`, { reason: typeof body.reason === "string" ? body.reason : "", photos: Array.isArray(body.photos) ? body.photos.filter((x) => typeof x === "string").slice(0, 5) : [] });
}
