/**
 * Pure helpers shared by the door pages: /events/door, /events/[id]/team and the scanner (roles, scan window, times).
 * No React, no network. Shapes follow outsyde-backend server/events/doorRouter.ts and doorAccess.ts.
 * Unit tests: tests/events-door-logic.test.ts.
 */

import { fmt } from "../../e/_shared/format";
import { guestName } from "./manageLogic";

/** "9:42 PM" in the event's own time zone. */
export function timeOnly(iso: string, tz: string): string {
  return fmt(iso, tz, { hour: "numeric", minute: "2-digit" });
}

/* ---------- scan window ---------- */

/** Same rule as backend doorAccess.isWithinScanWindow: opens 6 hours before the start, closes at the end. */
export const SCAN_OPENS_BEFORE_START_MS = 6 * 60 * 60 * 1000;

/**
 * A plain note when check in isn't open yet or has closed, else null. Times in the event's own time zone.
 * A known status other than published (draft, cancelled, paused) is closed, as in the backend.
 */
export function scanWindowNote(e: { startsAt: string; endsAt: string; timezone: string; status?: string }, now: Date = new Date()): string | null {
  if (e.status !== undefined && e.status !== "published") return "Check in is closed for this event.";
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

/** Usernames are at most 40 characters (backend addSchema); one extra is allowed only for a leading @. */
export const USERNAME_MAX = 40;
export function usernameMax(input: string): number {
  return input.startsWith("@") ? USERNAME_MAX + 1 : USERNAME_MAX;
}

export function removeConfirmCopy(m: TeamMember, scope: Scope): string {
  const who = guestName(m);
  return scope === "standing"
    ? `Remove ${who} from your door team? They stop being able to scan all your events.`
    : `Remove ${who} from this event's door team? They stop being able to scan this event.`;
}
