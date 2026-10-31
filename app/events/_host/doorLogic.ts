/**
 * Pure helpers shared by the door pages: /events/door, /events/[id]/team and the scanner (roles, scan window, times).
 * p4-team step 8 (call 51): "Event team" everywhere on the website, never "door team".
 * No React, no network. Shapes follow outsyde-backend server/events/doorRouter.ts and doorAccess.ts.
 * Unit tests: tests/events-door-logic.test.ts.
 */

import { fmt } from "../../e/_shared/format";
import { guestHandle, guestName } from "./manageLogic";

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

/** inviteId (backend p4-scanner, additive): the accepted invite behind a member's row, null for the host's own events. */
export interface DoorEvent { id: string; slug: string; title: string; startsAt: string; endsAt: string; timezone: string; role: DoorRole; inviteId?: string | null }

export function isDoorEvent(x: unknown): x is DoorEvent {
  const e = x as DoorEvent | null;
  return !!e && typeof e.id === "string" && typeof e.title === "string" && typeof e.startsAt === "string"
    && typeof e.endsAt === "string" && typeof e.timezone === "string" && ["host", "standing", "event"].includes(e.role);
}

/** A member (not the host) can leave the team from /events/door when the row carries its invite id. */
export function canLeave(e: DoorEvent): boolean {
  return e.role !== "host" && typeof e.inviteId === "string" && e.inviteId.length > 0;
}

export function leaveConfirmCopy(e: DoorEvent): string {
  return e.role === "standing"
    ? "Leave this host's Event team? You won't be on the team for any of their events."
    : `Leave the Event team for ${e.title}? You won't be on the team for it anymore.`;
}

export function roleLabel(role: DoorRole): string {
  if (role === "host") return "Your event";
  if (role === "standing") return "Event team";
  return "Event team, this event";
}

/* ---------- door team ---------- */

export type Scope = "standing" | "event";

export type MemberStatus = "invited" | "accepted" | "declined";

/** status, inviteId, invitedAt come with door team invites (backend migration 075); older responses lack them. */
export interface TeamMember {
  userId: string; firstName: string | null; username: string | null; addedAt: string | null;
  status?: MemberStatus; inviteId?: string; invitedAt?: string | null;
}

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

/** Missing or unknown status = on the team (a response from before invites). */
export function memberStatus(m: TeamMember): MemberStatus {
  return m.status === "invited" || m.status === "declined" ? m.status : "accepted";
}

/** Second line of a team row (canvas 38). The @handle is left out when the name already is the handle. */
export function memberStatusLine(m: TeamMember, scope: Scope): string {
  const st = memberStatus(m);
  const text = st === "invited" ? "Invited, waiting for them to accept"
    : st === "declined" ? "Said no. You can invite them again."
    : scope === "event" ? "On the team until the event ends" : "On the team";
  return [m.firstName?.trim() ? guestHandle(m) : "", text].filter(Boolean).join(" · ");
}

export function memberAction(m: TeamMember): "Remove" | "Cancel invite" | "Invite again" {
  const st = memberStatus(m);
  return st === "invited" ? "Cancel invite" : st === "declined" ? "Invite again" : "Remove";
}

export function cancelInviteCopy(m: TeamMember): string {
  return `Cancel ${guestName(m)}'s invite? They won't be able to accept it.`;
}

export function inviteSentCopy(m: TeamMember): string {
  return `Invite sent. ${guestName(m)} can scan once they accept.`;
}

/* ---------- invites for me (GET /door/invites) ---------- */

export type InviteStatus = "invited" | "accepted" | "declined" | "gone";

export interface DoorInvite {
  id: string; scope: Scope; role: string; status: InviteStatus; invitedAt: string | null;
  host: { name: string };
  event: { id: string; title: string; startsAt: string; endsAt: string; timezone: string } | null;
  upcoming: { id: string; title: string; startsAt: string; timezone: string }[];
}

export function isDoorInvite(x: unknown): x is DoorInvite {
  const i = x as DoorInvite | null;
  return !!i && typeof i.id === "string" && (i.scope === "standing" || i.scope === "event")
    && ["invited", "accepted", "declined", "gone"].includes(i.status)
    && !!i.host && typeof i.host.name === "string" && Array.isArray(i.upcoming)
    && (i.event === null || (typeof i.event?.title === "string" && typeof i.event.startsAt === "string" && typeof i.event.timezone === "string"));
}

export function inviteHeadline(i: DoorInvite): string {
  return `${i.host.name} invited you to their Event team`;
}

/** Canvas 40: what the invite covers, the event day in the event's own zone. */
export function inviteScopeLine(i: DoorInvite): string {
  const what = i.scope === "event" && i.event
    ? `Only this event: ${i.event.title}, ${fmt(i.event.startsAt, i.event.timezone, { weekday: "short", month: "short", day: "numeric" })}.`
    : `All of ${i.host.name}'s events.`;
  return `${what} You can scan tickets and see the guest list.`;
}

export function inviteAnsweredCopy(answer: "accepted" | "declined", i: DoorInvite): string {
  if (answer === "declined") return `Invite declined. ${i.host.name} can see you said no.`;
  return i.scope === "event"
    ? "You're on the Event team. The event is in your list below."
    : "You're on the Event team. Their events are in your list below.";
}

export function removeConfirmCopy(m: TeamMember, scope: Scope): string {
  const who = guestName(m);
  return scope === "standing"
    ? `Remove ${who} from your Event team? They stop being on the team for all your events.`
    : `Remove ${who} from this event's team? They stop being on the team for this event.`;
}
