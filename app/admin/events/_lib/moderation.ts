/**
 * p5-safety (Legend's calls W1 to W7, 2026-11-01): the admin Reports tab and the Safety box on one event.
 * Pure rules, no React, no network: which moderation actions an event can take, their copy, request URLs and bodies,
 * and the error copy. Backend: adminEventsRouter (GET /reports, POST /:id/pause|release|cancel|reports/dismiss,
 * POST /hosts/:userId/trust) and, for posts, POST /api/admin/moderation/action (remove or dismiss).
 */

export const REASON_MAX = 500;

export type EventAction = "pause" | "release" | "cancel" | "dismiss";
export type PostAction = "remove" | "dismiss";

export const EVENT_ACTION_LABEL: Record<EventAction, string> = {
  pause: "Pause",
  release: "Release",
  cancel: "Cancel and refund everyone",
  dismiss: "Dismiss reports",
};

/** What the confirm step says before the request goes out. */
export const EVENT_ACTION_CONFIRM: Record<EventAction, string> = {
  pause: "Put this event on hold? Ticket sales stop, the public page is hidden and the payout waits. Ticket holders keep their tickets. The host gets an email and a push with your reason.",
  release: "Put this event live again? Sales open again and the host gets an email and a push with your reason.",
  cancel: "Cancel this event and refund every guest in full? Guests are told Outsyde cancelled it. The host gets an email and a push with your reason. This can't be undone.",
  dismiss: "Close these reports and leave the event as it is?",
};

export const EVENT_ACTION_DONE: Record<EventAction, string> = {
  pause: "Event put on hold. The host was told.",
  release: "Event is live again. The host was told.",
  cancel: "Event cancelled. Every guest is being refunded and the host was told.",
  dismiss: "Reports dismissed.",
};

export const POST_ACTION_LABEL: Record<PostAction, string> = { remove: "Remove post", dismiss: "Dismiss reports" };
export const POST_ACTION_CONFIRM: Record<PostAction, string> = {
  remove: "Remove this post from every feed? Its reports are closed.",
  dismiss: "Close these reports and leave the post up?",
};
export const POST_ACTION_DONE: Record<PostAction, string> = { remove: "Post removed.", dismiss: "Reports dismissed." };

/** The backend's state guards, in plain words (adminEventsRouter MODERATION_MESSAGES). */
const CODE_TEXT: Record<string, string> = {
  NOT_PUBLISHED: "Only a live event can be paused. Reload to see where it is.",
  NOT_PAUSED: "Only a paused event can be released. Reload to see where it is.",
  NOT_CANCELLABLE: "Only a live or paused event can be cancelled here. Reload to see where it is.",
  EVENT_NOT_FOUND: "This event wasn't found. It may have been removed.",
  HOST_NOT_FOUND: "This host wasn't found.",
  INVALID_INPUT: "Add a reason first.",
};

/** Error copy for a failed moderation request (flat BFF body { error, code }). Known codes win, then the message. */
export function moderationErrorText(body: unknown, status: number): string {
  const b = (body ?? {}) as { error?: unknown; code?: unknown; message?: unknown };
  const code = typeof b.code === "string" ? b.code : "";
  if (code && CODE_TEXT[code]) return CODE_TEXT[code];
  const msg = (typeof b.error === "string" && b.error.trim()) || (typeof b.message === "string" && b.message.trim()) || "";
  return msg || `Something went wrong (${status}). Try again.`;
}

/**
 * The actions an event can take right now: pause only while live (published), release only while paused, cancel
 * while live or paused (also after the start, which hosts can't do), dismiss whenever it has pending reports.
 */
export function eventActionsFor(status: string, pendingReports: number): EventAction[] {
  const out: EventAction[] = [];
  if (status === "published") out.push("pause");
  if (status === "paused") out.push("release");
  if (status === "published" || status === "paused") out.push("cancel");
  if (pendingReports > 0) out.push("dismiss");
  return out;
}

/** A reason is required for every action: 1 to 500 characters after trimming. null when it's fine. */
export function reasonError(reason: string): string | null {
  const t = reason.trim();
  if (!t) return "Add a reason. The host sees it for pause, release and cancel.";
  if (t.length > REASON_MAX) return `Keep the reason under ${REASON_MAX} characters.`;
  return null;
}

/** BFF path for an event action (the BFF forwards to /api/admin/events/:id/...). */
export function eventActionPath(action: EventAction, eventId: string): string {
  const id = encodeURIComponent(eventId);
  return action === "dismiss" ? `/api/admin/events/${id}/reports/dismiss` : `/api/admin/events/${id}/${action}`;
}

export function postActionPath(postId: string): string {
  return `/api/admin/events/posts/${encodeURIComponent(postId)}/action`;
}

export function trustPath(userId: string): string {
  return `/api/admin/events/hosts/${encodeURIComponent(userId)}/trust`;
}

export type ModerationSummary = { pendingReports: number; hostLimited: boolean; hostTrusted: boolean; hostType: string | null };

/** The moderation field from the admin event detail; older backends send none (null). */
export function readModeration(v: unknown): ModerationSummary | null {
  if (!v || typeof v !== "object") return null;
  const m = v as Record<string, unknown>;
  if (typeof m.pendingReports !== "number" || typeof m.hostLimited !== "boolean" || typeof m.hostTrusted !== "boolean") return null;
  return { pendingReports: m.pendingReports, hostLimited: m.hostLimited, hostTrusted: m.hostTrusted, hostType: typeof m.hostType === "string" ? m.hostType : null };
}

/** The host's first event limit state, for a personal host only (businesses and photographers have no limits). */
export function trustState(m: ModerationSummary | null): { text: string; tone: "ok" | "warn"; trusted: boolean } | null {
  if (!m || m.hostType !== "user") return null;
  if (m.hostTrusted) return { text: "Trusted host, new host limits lifted", tone: "ok", trusted: true };
  if (m.hostLimited) return { text: "Under new host limits: 100 paid tickets per event, $100 per ticket", tone: "warn", trusted: false };
  return { text: "New host limits lifted: a paid out event with at least 5 paying guests", tone: "ok", trusted: false };
}

/* ---------- Reports list ---------- */

export type ReportReason = { reason: string; label?: string; note?: string | null; reporter: string | null; at: string };

export type EventReport = {
  eventId: string; title: string; slug: string | null; status: string; startsAt: string | null;
  host: { id: string; username: string | null; firstName: string | null };
  reportCount: number; firstAt: string; lastAt: string; reasons: ReportReason[];
};

export type PostReport = {
  postId: string; content: string | null; mediaUrl: string | null; active: boolean;
  author: { id: string | null; username: string | null };
  reportCount: number; flagCount: number; lastAt: string; reasons: ReportReason[];
};

/** The six event reasons (backend REPORT_REASONS) plus the older post reasons the app sends as free text. */
const REASON_LABEL: Record<string, string> = {
  scam: "Scam or fake event",
  illegal: "Illegal or dangerous",
  hate: "Hate, harassment or violence",
  sexual: "Sexual content",
  wrong_details: "Wrong date, place or details",
  other: "Something else",
};

/**
 * A report time as UTC. Backends before outsyde-backend #406 sent it with no zone (a timestamp without time zone),
 * which a browser reads as its own local time; a time with no zone is read as UTC.
 */
export function utcTime(at: string | null | undefined): string | null {
  if (!at) return null;
  const t = at.trim();
  return /(Z|[+-]\d{2}:?\d{2})$/i.test(t) ? t : `${t.replace(" ", "T")}Z`;
}

export function reasonLabel(r: ReportReason): string {
  if (typeof r.label === "string" && r.label.trim()) return r.label;
  return REASON_LABEL[r.reason] ?? r.reason;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Keep only well formed rows, so one odd row never breaks the tab. */
export function readEventReports(v: unknown): EventReport[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is EventReport => isObj(x) && typeof x.eventId === "string" && typeof x.title === "string"
    && typeof x.status === "string" && typeof x.reportCount === "number" && isObj(x.host) && Array.isArray(x.reasons));
}

export function readPostReports(v: unknown): PostReport[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is PostReport => isObj(x) && typeof x.postId === "string" && typeof x.reportCount === "number"
    && isObj(x.author) && Array.isArray(x.reasons));
}

/** "3 people reported this" */
export function reportCountText(n: number): string {
  return n === 1 ? "1 person reported this" : `${n} people reported this`;
}

/** Event status as the Reports tab shows it. */
export function eventStatusText(status: string): string {
  switch (status) {
    case "published": return "Live";
    case "paused": return "On hold";
    case "cancelled": return "Cancelled";
    case "draft": return "Draft";
    default: return status;
  }
}

/** The admin email links to goutsyde.com/admin/events with the Reports tab: #reports opens it. */
export type AdminEventsTab = "money" | "reports";
export function tabFromHash(hash: string): AdminEventsTab {
  return hash.replace(/^#/, "") === "reports" ? "reports" : "money";
}
