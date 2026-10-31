import { NextRequest } from "next/server";
import { badRequest, forward, isUuid, notFound, TEAM_ROLES } from "../../../../_lib/bff";

const SCOPES = new Set(["standing", "event"]);
const REASONS = new Set(["late", "no_show", "unprofessional", "other"]);

/**
 * Take someone off (or cancel an invite). Step 8: ?role= picks the spot (missing = Admissions, as before), and
 * ?reason= / ?note= say why (the backend needs a reason for an accepted paid spot and checks the note).
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  if (!isUuid(id) || !isUuid(userId)) return notFound();
  const sp = req.nextUrl.searchParams;
  const scope = sp.get("scope") ?? "";
  if (!SCOPES.has(scope)) return badRequest("INVALID_REQUEST", "scope: choose standing or event.");
  const q = new URLSearchParams({ scope });
  const role = sp.get("role");
  if (role !== null) {
    if (!TEAM_ROLES.has(role)) return badRequest("INVALID_REQUEST", "role: choose door, security, host, entertainment, media, cohost or other.");
    q.set("role", role);
  }
  const reason = sp.get("reason");
  if (reason !== null && reason !== "") {
    if (!REASONS.has(reason)) return badRequest("INVALID_REQUEST", "reason: choose late, no_show, unprofessional or other.");
    q.set("reason", reason);
  }
  const note = sp.get("note");
  if (note !== null && note !== "") {
    if (note.length > 200) return badRequest("INVALID_REQUEST", "note: up to 200 characters.");
    q.set("note", note);
  }
  return forward(req, "DELETE", `/api/events/${id}/door/team/${userId}`, undefined, q);
}
