/** Unit tests for the shared door helpers (roles, scan window, door team). No server: npx tsx tests/events-door-logic.test.ts */
import {
  scanWindowNote, isDoorEvent, roleLabel, cleanUsername, removeConfirmCopy, usernameMax, USERNAME_MAX, timeOnly,
  memberStatus, memberStatusLine, memberAction, cancelInviteCopy, inviteSentCopy, isDoorInvite, inviteHeadline, inviteScopeLine,
  inviteAnsweredCopy, leaveConfirmCopy, canLeave, type DoorInvite, type TeamMember,
} from "../app/events/_host/doorLogic";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}
const tz = "America/New_York";

eq(timeOnly("2026-10-25T01:42:00.000Z", tz), "9:42 PM", "time in the event zone");
eq(timeOnly("2026-10-25T01:42:00.000Z", "Asia/Tokyo"), "10:42 AM", "time follows the zone given");

// scan window (opens 6 hours before the start, closes at the end, like isWithinScanWindow)
const ev = { startsAt: "2026-10-25T01:00:00.000Z", endsAt: "2026-10-25T06:00:00.000Z", timezone: tz };
eq(scanWindowNote(ev, new Date("2026-10-24T18:59:59.000Z")), "Check in opens Sat, Oct 24 at 3:00 PM, 6 hours before the start.", "before the window");
eq(scanWindowNote(ev, new Date("2026-10-24T19:00:00.000Z")), null, "window opens exactly 6 hours before");
eq(scanWindowNote(ev, new Date("2026-10-25T06:00:00.000Z")), null, "still open at the end time");
eq(scanWindowNote(ev, new Date("2026-10-25T06:00:00.001Z")), "Check in has closed for this event.", "closed after the end");

// door/mine
eq(isDoorEvent({ id: "e", slug: "s", title: "T", startsAt: "a", endsAt: "b", timezone: tz, role: "standing" }), true, "door event guard");
eq(isDoorEvent({ id: "e", title: "T", startsAt: "a", endsAt: "b", timezone: tz, role: "admin" }), false, "unknown role rejected");
eq([roleLabel("host"), roleLabel("standing"), roleLabel("event")], ["Your event", "Event team", "Event team, this event"], "role labels");

// door team
eq(cleanUsername("  @marcus "), "marcus", "username: trims and drops the @");
eq(cleanUsername("marcus"), "marcus", "username unchanged");
eq(removeConfirmCopy({ userId: "u", firstName: "Marcus", username: "marcus", addedAt: null }, "standing"),
  "Remove Marcus from your Event team? They stop being on the team for all your events.", "remove standing copy");
eq(removeConfirmCopy({ userId: "u", firstName: null, username: "marcus", addedAt: null }, "event"),
  "Remove @marcus from this event's team? They stop being on the team for this event.", "remove event copy");

eq(scanWindowNote({ ...ev, status: "published" }, new Date("2026-10-24T20:00:00.000Z")), null, "published inside the window");
eq(scanWindowNote({ ...ev, status: "cancelled" }, new Date("2026-10-24T20:00:00.000Z")), "Check in is closed for this event.", "cancelled is closed");
eq(scanWindowNote({ ...ev, status: "draft" }, new Date("2026-10-24T20:00:00.000Z")), "Check in is closed for this event.", "draft is closed");
eq([USERNAME_MAX, usernameMax("marcus"), usernameMax("@marcus"), usernameMax("")], [40, 40, 41, 40], "username max: 40, 41 only with a leading @");


// p4-scanner: invites (backend 075). Old responses without status count as on the team.
const mem = (o: Partial<TeamMember>): TeamMember => ({ userId: "u", firstName: "Marcus", username: "marcus", addedAt: null, ...o });
eq([memberStatus(mem({})), memberStatus(mem({ status: "invited" })), memberStatus(mem({ status: "declined" })), memberStatus(mem({ status: "accepted" })), memberStatus(mem({ status: "weird" as any }))],
  ["accepted", "invited", "declined", "accepted", "accepted"], "member status, missing or unknown = on the team");
eq(memberStatusLine(mem({ status: "accepted" }), "standing"), "@marcus · On the team", "standing on the team line");
eq(memberStatusLine(mem({ status: "accepted" }), "event"), "@marcus · On the team until the event ends", "event on the team line");
eq(memberStatusLine(mem({ status: "invited" }), "event"), "@marcus · Invited, waiting for them to accept", "invited line");
eq(memberStatusLine(mem({ status: "declined" }), "standing"), "@marcus · Said no. You can invite them again.", "declined line");
eq(memberStatusLine(mem({ status: "invited", firstName: null }), "event"), "Invited, waiting for them to accept", "no handle twice when the name is the handle");
eq([memberAction(mem({ status: "accepted" })), memberAction(mem({ status: "invited" })), memberAction(mem({ status: "declined" }))], ["Remove", "Cancel invite", "Invite again"], "row actions");
eq(cancelInviteCopy(mem({})), "Cancel Marcus's invite? They won't be able to accept it.", "cancel invite copy");
eq(inviteSentCopy(mem({ firstName: null })), "Invite sent. @marcus can scan once they accept.", "invite sent copy");

const inv = (o: Partial<DoorInvite>): DoorInvite => ({
  id: "i1", scope: "event", role: "door", status: "invited", invitedAt: "2026-10-28T12:00:00.000Z", host: { name: "Club Nine" },
  event: { id: "e1", title: "Late Night", startsAt: "2026-11-01T01:00:00.000Z", endsAt: "2026-11-01T06:00:00.000Z", timezone: tz }, upcoming: [], ...o,
});
eq(isDoorInvite(inv({})), true, "invite guard");
eq(isDoorInvite({ ...inv({}), status: "maybe" }), false, "unknown status rejected");
eq(isDoorInvite({ ...inv({}), host: null }), false, "invite needs a host");
eq(isDoorInvite(inv({ scope: "standing", event: null, upcoming: [{ id: "e2", title: "T", startsAt: "2026-11-01T01:00:00.000Z", timezone: tz }] })), true, "standing invite guard");
eq(inviteHeadline(inv({})), "Club Nine invited you to their Event team", "headline");
eq(inviteScopeLine(inv({})), "Only this event: Late Night, Sat, Oct 31. You can scan tickets and see the guest list.", "event scope line in the event's zone");
eq(inviteScopeLine(inv({ scope: "standing", event: null })), "All of Club Nine's events. You can scan tickets and see the guest list.", "standing scope line");
eq(inviteAnsweredCopy("accepted", inv({})), "You're on the Event team. The event is in your list below.", "accepted copy, event");
eq(inviteAnsweredCopy("accepted", inv({ scope: "standing", event: null })), "You're on the Event team. Their events are in your list below.", "accepted copy, standing");
eq(inviteAnsweredCopy("declined", inv({})), "Invite declined. Club Nine can see you said no.", "declined copy");
for (const s of [inviteScopeLine(inv({})), inviteAnsweredCopy("declined", inv({})), memberStatusLine(mem({ status: "declined" }), "event")]) {
  eq(/[–—]| - /.test(s), false, `no dashes: ${s.slice(0, 30)}`);
}

// Leave (review #2): members can leave from /events/door
const dev = (o: object) => ({ id: "e", slug: "s", title: "Late Night", startsAt: "a", endsAt: "b", timezone: tz, role: "event", inviteId: "i9", ...o }) as any;
eq([canLeave(dev({})), canLeave(dev({ role: "standing" })), canLeave(dev({ role: "host", inviteId: null })), canLeave(dev({ inviteId: null })), canLeave(dev({ inviteId: undefined }))],
  [true, true, false, false, false], "Leave only for a member row that has its invite id");
eq(leaveConfirmCopy(dev({})), "Leave the Event team for Late Night? You won't be on the team for it anymore.", "leave copy, one event");
eq(leaveConfirmCopy(dev({ role: "standing" })), "Leave this host's Event team? You won't be on the team for any of their events.", "leave copy, all events");
eq(isDoorEvent(dev({})), true, "door event guard accepts inviteId");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
