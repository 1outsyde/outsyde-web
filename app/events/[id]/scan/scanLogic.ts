/**
 * Pure helpers for the door scanner (/events/[id]/scan), the door team (/events/[id]/team) and /events/door.
 * No React, no network. Shapes follow outsyde-backend server/events/doorRouter.ts and doorAccess.ts.
 * Unit tests: tests/events-scan-logic.test.ts.
 */

import { fmt, GENERIC_ERROR, type ApiBody } from "../../../e/_shared/format";
import { guestName, type DoorGuest } from "../../_host/manageLogic";

/* ---------- ticket codes ---------- */

/** The ticket code inside every QR: 16 characters, A to Z and 0 to 9 (backend codeSchema). */
export const CODE_RE = /^[A-Z0-9]{16}$/;
export const CODE_LENGTH = 16;

/** QR text to a ticket code: trimmed and uppercased. Anything that isn't exactly a 16 character code is null. */
export function qrToCode(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const code = text.trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

/** What the manual entry box keeps while typing: uppercase letters and digits only, at most 16. */
export function cleanTyped(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH);
}

/* ---------- duplicate suppression ---------- */

export const DUPLICATE_WINDOW_MS = 3000;

/**
 * Remembers what was sent and when. `allow(key, now)` is true (and records the send) unless the same key was
 * allowed less than `windowMs` ago. Keys are codes, or raw QR text for codes that are not valid.
 */
export function makeRecent(windowMs: number = DUPLICATE_WINDOW_MS) {
  const seen = new Map<string, number>();
  return {
    allow(key: string, now: number): boolean {
      for (const [k, at] of seen) if (now - at >= windowMs) seen.delete(k);
      const at = seen.get(key);
      if (at !== undefined && now - at < windowMs) return false;
      seen.set(key, now);
      return true;
    },
  };
}

/* ---------- results ---------- */

export type Tone = "ok" | "warn" | "bad";

export interface ScanResult {
  /** The backend outcome: CHECKED_IN or the backend error code (or INVALID_CODE, NETWORK, ERROR locally). */
  outcome: string;
  tone: Tone;
  title: string;
  who: string;
  detail: string;
  /** Present for CHECKED_IN and ALREADY_CHECKED_IN, so the host can undo. */
  ticket: DoorGuest | null;
}

export const TONE_BG: Record<Tone, string> = { ok: "#1E6B45", warn: "#8A5B00", bad: "#8C2B2B" };

function isGuest(x: unknown): x is DoorGuest {
  const g = x as DoorGuest | null;
  return !!g && typeof g.ticketId === "string" && typeof g.ticketTypeName === "string";
}

const whoLine = (g: DoorGuest) => `${guestName(g)} · ${g.ticketTypeName}`;
const msg = (body: ApiBody, fallback: string) =>
  typeof body?.error === "string" && body.error.trim() ? body.error : fallback;

/** "9:42 PM" in the event's own time zone. */
export function timeOnly(iso: string, tz: string): string {
  return fmt(iso, tz, { hour: "numeric", minute: "2-digit" });
}

/** The invalid code card, shown locally for a QR or typed code that isn't a ticket code (no backend call). */
export function invalidCodeResult(): ScanResult {
  return { outcome: "INVALID_CODE", tone: "bad", title: "Invalid code", who: "", detail: "That isn't a valid ticket code. Try again or type the code.", ticket: null };
}

/**
 * The result card for a check in answer. `status` 0 means the network failed.
 * Body is the BFF body: { success:true, result:"checked_in", ticket } or { success:false, error, code, ticket?, otherEvent? }.
 */
export function resultFor(status: number, body: any, tz: string): ScanResult { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (status === 0) {
    return { outcome: "NETWORK", tone: "warn", title: "No connection", who: "", detail: "Couldn't reach Outsyde. Check your connection and scan again.", ticket: null };
  }
  if (status === 200 && body?.success && isGuest(body.ticket)) {
    return { outcome: "CHECKED_IN", tone: "ok", title: "Checked in", who: whoLine(body.ticket), detail: "Let them in.", ticket: body.ticket };
  }
  const code = typeof body?.code === "string" ? body.code : "";
  switch (code) {
    case "ALREADY_CHECKED_IN": {
      const t = isGuest(body.ticket) ? body.ticket : null;
      let detail = "This ticket was already scanned.";
      if (t?.checkedInAt) {
        detail = `This ticket was scanned at ${timeOnly(t.checkedInAt, tz)}${t.checkedInBy ? ` by ${t.checkedInBy}` : ""}.`;
      }
      return { outcome: code, tone: "warn", title: "Already checked in", who: t ? whoLine(t) : "", detail, ticket: t };
    }
    case "WRONG_EVENT": {
      const other = typeof body?.otherEvent?.title === "string" ? body.otherEvent.title : null;
      return {
        outcome: code, tone: "bad", title: "Not for this event", who: other ? `Ticket for ${other}` : msg(body, "This ticket is for another event."),
        detail: "Ask the guest to open the right ticket in My Tickets.", ticket: null,
      };
    }
    case "NOT_PAID":
      return { outcome: code, tone: "bad", title: "Not paid", who: "", detail: `${msg(body, "This ticket isn't paid for yet.")} Do not let it in.`, ticket: null };
    case "NOT_VALID":
      return { outcome: code, tone: "bad", title: "Not valid", who: "", detail: `${msg(body, "This ticket is not valid. It was refunded or cancelled.")} Do not let it in.`, ticket: null };
    case "NOT_FOUND":
      return { outcome: code, tone: "bad", title: "Not found", who: "", detail: msg(body, "No ticket found for that code."), ticket: null };
    case "CHECKIN_CLOSED":
      return { outcome: code, tone: "warn", title: "Check in closed", who: "", detail: msg(body, "Check in isn't open for this event right now."), ticket: null };
    case "INVALID_CODE":
      return { ...invalidCodeResult(), detail: msg(body, "That isn't a valid ticket code.") };
    case "RATE_LIMITED":
      return { outcome: code, tone: "warn", title: "Slow down", who: "", detail: msg(body, "Too many scans. Wait a moment and try again."), ticket: null };
    case "EVENT_NOT_FOUND":
      return { outcome: code, tone: "bad", title: "No access", who: "", detail: "You can't scan for this event anymore. Ask the host to add you again.", ticket: null };
    default:
      return { outcome: "ERROR", tone: "bad", title: "Couldn't check in", who: "", detail: status >= 500 ? GENERIC_ERROR : msg(body, GENERIC_ERROR), ticket: null };
  }
}

/** The short label in the "Last scans" list. */
export function lastScanLabel(r: ScanResult): string {
  if (r.outcome === "CHECKED_IN") return "In";
  if (r.outcome === "ALREADY_CHECKED_IN") return "Already in";
  return r.title;
}

export const LAST_SCAN_COLOR: Record<Tone, string> = { ok: "#6FD39B", warn: "#F0B54A", bad: "#FF8A7A" };

/* ---------- scan window ---------- */

/** Same rule as backend doorAccess.isWithinScanWindow: opens 6 hours before the start, closes at the end. */
export const SCAN_OPENS_BEFORE_START_MS = 6 * 60 * 60 * 1000;

/** A plain note when check in isn't open yet or has closed, else null. Times in the event's own time zone. */
export function scanWindowNote(e: { startsAt: string; endsAt: string; timezone: string }, now: Date = new Date()): string | null {
  const opens = new Date(e.startsAt).getTime() - SCAN_OPENS_BEFORE_START_MS;
  const t = now.getTime();
  if (t < opens) {
    const iso = new Date(opens).toISOString();
    const day = fmt(iso, e.timezone, { weekday: "short", month: "short", day: "numeric" });
    return `Check in opens ${day} at ${timeOnly(iso, e.timezone)}, 6 hours before the start.`;
  }
  if (t > new Date(e.endsAt).getTime()) return "Check in has closed for this event.";
  return null;
}

/* ---------- guests ---------- */

/** Search by first name, @username or ticket type. A leading @ is ignored. */
export function filterGuests(guests: DoorGuest[], query: string): DoorGuest[] {
  const q = query.trim().replace(/^@/, "").toLowerCase();
  if (!q) return guests;
  return guests.filter((g) =>
    [g.firstName, g.username, g.ticketTypeName].some((v) => typeof v === "string" && v.toLowerCase().includes(q)));
}

/** Replace one guest in the list by ticket id (after a check in or undo). Unknown tickets are left out. */
export function replaceGuest(guests: DoorGuest[], t: DoorGuest): DoorGuest[] {
  return guests.map((g) => (g.ticketId === t.ticketId ? t : g));
}

/** Width of the progress bar, 0 to 100. */
export function progressPct(checkedIn: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(100, Math.round((checkedIn / total) * 100))) : 0;
}

/* ---------- door roles (/door/mine) ---------- */

export type DoorRole = "host" | "standing" | "event";

export interface DoorEvent { id: string; slug: string; title: string; startsAt: string; endsAt: string; timezone: string; role: DoorRole }

export function isDoorEvent(x: unknown): x is DoorEvent {
  const e = x as DoorEvent | null;
  return !!e && typeof e.id === "string" && typeof e.title === "string" && typeof e.startsAt === "string"
    && typeof e.endsAt === "string" && typeof e.timezone === "string" && ["host", "standing", "event"].includes(e.role);
}

export function roleLabel(role: DoorRole): string {
  if (role === "host") return "Your event";
  if (role === "standing") return "Door team";
  return "Door team, this event";
}

/* ---------- door team ---------- */

export type Scope = "standing" | "event";

export interface TeamMember { userId: string; firstName: string | null; username: string | null; addedAt: string | null }

export function isTeamMember(x: unknown): x is TeamMember {
  const m = x as TeamMember | null;
  return !!m && typeof m.userId === "string";
}

/** "@marcus" typed or pasted: trimmed, one leading @ removed. */
export function cleanUsername(input: string): string {
  return input.trim().replace(/^@/, "").trim();
}

export function removeConfirmCopy(m: TeamMember, scope: Scope): string {
  const who = guestName(m);
  return scope === "standing"
    ? `Remove ${who} from your door team? They stop being able to scan all your events.`
    : `Remove ${who} from this event's door team? They stop being able to scan this event.`;
}
