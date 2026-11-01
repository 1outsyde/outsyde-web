/**
 * The Event Team note on goutsyde.com (p4-team step 9d-2, Legend's calls 79 to 85, backend #403). A team member
 * accepts it to be paid through Outsyde. Shown when they take a spot that offers pay (one "Accept and join"), and on
 * their event page while they have pay and haven't accepted, whatever the backend's TEAM_NOTE_REQUIRED switch says
 * (call 85). Joining is never blocked (call 81): join first, then the note (call 84). Pure. Copy rule: no dashes.
 * Unit tests: tests/team-note-logic.test.ts.
 */

export interface TeamNote {
  version: string;
  title: string;
  intro: string;
  points: string[];
  accepted: boolean;
  acceptedAt: string | null;
}

export function isTeamNote(x: unknown): x is TeamNote {
  const n = x as TeamNote | null;
  return !!n && typeof n.version === "string" && typeof n.title === "string" && Array.isArray(n.points)
    && n.points.every((p) => typeof p === "string") && typeof n.accepted === "boolean";
}

/** An invite's or a link's pay (both carry payType and commissionPercent): anything but No pay. */
export function payOffered(pay: unknown): boolean {
  const p = pay as { payType?: unknown; commissionPercent?: unknown } | null;
  if (!p || !["none", "fixed", "hourly"].includes(String(p.payType))) return false;
  return p.payType !== "none" || (typeof p.commissionPercent === "number" && p.commissionPercent > 0);
}

/** Show the note with Accept: the spot offers pay and they haven't accepted it. A note that didn't load: no card. */
export const noteOnAccept = (pay: unknown, note: TeamNote | null) => payOffered(pay) && !!note && !note.accepted;

export const acceptLabel = (withNote: boolean) => (withNote ? "Accept and join" : "Accept");

/** Their event page: they have pay, it isn't worked out yet, and they haven't accepted. */
export const noteOnMyPage = (s: { hasPay: boolean; paidOut: boolean }, note: TeamNote | null) =>
  s.hasPay && !s.paidOut && !!note && !note.accepted;

/** The "Set up payouts" link: only when payout setup is what's missing (older backends: whenever anything is). */
export function setupLinkShown(s: { needed: boolean; deadline: string | null; stripeNeeded?: boolean; noteNeeded?: boolean } | null): boolean {
  if (!s?.needed) return false;
  return typeof s.stripeNeeded === "boolean" ? s.stripeNeeded : true;
}

/** Joined, but saving the note failed (call 84). */
export const NOTE_SAVE_FAILED = "You're on the team. Your acceptance of the Event Team note didn't save, so it's waiting on your event page.";
