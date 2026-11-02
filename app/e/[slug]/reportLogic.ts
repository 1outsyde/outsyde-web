/**
 * p5-safety (Legend's calls W8 to W10, 2026-11-01): Report this event and the on hold page. Pure, no React, no network.
 * Backend: POST /api/events/:id/report { reason, note } (eventModeration.ts): signed in only, published or paused
 * events, never the host, co-hosts or the event's team (403 CANT_REPORT_OWN); "other" needs a note; notes up to 500.
 */
import { GENERIC_ERROR } from "../_shared/format";

export const REPORT_NOTE_MAX = 500;

/** Same keys and words as the backend's REPORT_REASONS, in the order the sheet lists them. */
export const REPORT_REASONS = [
  { id: "scam", label: "Scam or fake event" },
  { id: "illegal", label: "Illegal or dangerous" },
  { id: "hate", label: "Hate, harassment or violence" },
  { id: "sexual", label: "Sexual content" },
  { id: "wrong_details", label: "Wrong date, place or details" },
  { id: "other", label: "Something else" },
] as const;

export type ReportReasonId = (typeof REPORT_REASONS)[number]["id"];

export const REPORT_COPY = {
  link: "Report this event",
  title: "Report this event",
  sub: "Tell us what's wrong. Outsyde reviews every report. The host isn't told who sent it.",
  pick: "Choose a reason.",
  noteNeeded: "Tell us what's wrong.",
  noteLabel: "Anything else we should know",
  noteLabelOther: "What's wrong",
  send: "Send report",
  thanks: "Thanks. We'll review this event.",
} as const;

export const ON_HOLD_COPY = {
  holder: "This event is on hold while Outsyde reviews it. Your ticket is safe, and we'll email you if anything changes.",
  host: "Outsyde put this event on hold. Check your email for the reason and next steps.",
  ticketRow: "On hold",
} as const;

const REASON_IDS = new Set<string>(REPORT_REASONS.map((r) => r.id));
export const isReportReason = (v: unknown): v is ReportReasonId => typeof v === "string" && REASON_IDS.has(v);

/** Problem with the form, or null when it can be sent. */
export function reportFormError(reason: string | null, note: string): string | null {
  if (!reason || !isReportReason(reason)) return REPORT_COPY.pick;
  const n = note.trim();
  if (reason === "other" && !n) return REPORT_COPY.noteNeeded;
  if (n.length > REPORT_NOTE_MAX) return `Keep it under ${REPORT_NOTE_MAX} characters.`;
  return null;
}

/** The request body: the note only when there is one. */
export function reportBody(reason: ReportReasonId, note: string): { reason: ReportReasonId; note?: string } {
  const n = note.trim();
  return n ? { reason, note: n } : { reason };
}

/**
 * Copy after a failed report (flat BFF body { error, code }). The backend's own message for a refusal it explains
 * (your own event, an inactive account, a bad reason), a not found line, the generic line for anything else.
 */
export function reportErrorCopy(status: number, body: unknown): string {
  const b = (body && typeof body === "object" ? body : {}) as { error?: unknown; code?: unknown };
  const code = typeof b.code === "string" ? b.code : "";
  const msg = typeof b.error === "string" ? b.error.trim() : "";
  if (status === 404) return "This event isn't available to report anymore.";
  if ((code === "CANT_REPORT_OWN" || code === "ACCOUNT_INACTIVE" || code === "INVALID_INPUT") && msg) return msg;
  return GENERIC_ERROR;
}

/** Who sees the Report link: a live or on hold event, not its host or co-hosts (team members get the backend's 403). */
export function canShowReport(e: { status: string; viewerIsHost: boolean; viewerIsCohost?: boolean }): boolean {
  return (e.status === "published" || e.status === "paused") && !e.viewerIsHost && !e.viewerIsCohost;
}

/** On hold banner copy for this viewer, or null when the event isn't on hold. */
export function onHoldBanner(e: { status: string; onHold?: boolean; viewerIsHost: boolean; viewerIsCohost?: boolean }): string | null {
  if (!(e.onHold === true || e.status === "paused")) return null;
  return e.viewerIsHost || e.viewerIsCohost ? ON_HOLD_COPY.host : ON_HOLD_COPY.holder;
}
