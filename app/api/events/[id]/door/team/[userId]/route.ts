import { NextRequest } from "next/server";
import { badRequest, forward, isUuid, notFound } from "../../../../_lib/bff";

const SCOPES = new Set(["standing", "event"]);

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  if (!isUuid(id) || !isUuid(userId)) return notFound();
  const scope = req.nextUrl.searchParams.get("scope") ?? "";
  if (!SCOPES.has(scope)) return badRequest("INVALID_REQUEST", "scope: choose standing or event.");
  return forward(req, "DELETE", `/api/events/${id}/door/team/${userId}`, undefined, new URLSearchParams({ scope }));
}
