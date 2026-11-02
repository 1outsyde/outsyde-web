// POST /api/events/:id/report  { reason, note? } → backend (p5-safety W8, W9). Only reason and a trimmed note are
// forwarded; the backend checks sign in, the event's state, who may report and the note length.

import { NextRequest } from "next/server";
import { badRequest, forward, invalidBody, isUuid, notFound, readJsonObject } from "../../_lib/bff";
import { REPORT_NOTE_MAX, isReportReason } from "@/app/e/[slug]/reportLogic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  if (!isReportReason(body.reason)) return badRequest("INVALID_INPUT", "Choose a reason.");
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > REPORT_NOTE_MAX) return badRequest("INVALID_INPUT", `Keep it under ${REPORT_NOTE_MAX} characters.`);
  return forward(req, "POST", `/api/events/${id}/report`, note ? { reason: body.reason, note } : { reason: body.reason });
}
