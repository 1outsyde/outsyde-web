/** Unit tests for the shared door helpers (roles, scan window, door team). No server: npx tsx tests/events-door-logic.test.ts */
import {
  scanWindowNote, isDoorEvent, roleLabel, cleanUsername, removeConfirmCopy, usernameMax, USERNAME_MAX, timeOnly,
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
eq([roleLabel("host"), roleLabel("standing"), roleLabel("event")], ["Your event", "Door team", "Door team, this event"], "role labels");

// door team
eq(cleanUsername("  @marcus "), "marcus", "username: trims and drops the @");
eq(cleanUsername("marcus"), "marcus", "username unchanged");
eq(removeConfirmCopy({ userId: "u", firstName: "Marcus", username: "marcus", addedAt: null }, "standing"),
  "Remove Marcus from your door team? They stop being able to scan all your events.", "remove standing copy");
eq(removeConfirmCopy({ userId: "u", firstName: null, username: "marcus", addedAt: null }, "event"),
  "Remove @marcus from this event's door team? They stop being able to scan this event.", "remove event copy");

eq(scanWindowNote({ ...ev, status: "published" }, new Date("2026-10-24T20:00:00.000Z")), null, "published inside the window");
eq(scanWindowNote({ ...ev, status: "cancelled" }, new Date("2026-10-24T20:00:00.000Z")), "Check in is closed for this event.", "cancelled is closed");
eq(scanWindowNote({ ...ev, status: "draft" }, new Date("2026-10-24T20:00:00.000Z")), "Check in is closed for this event.", "draft is closed");
eq([USERNAME_MAX, usernameMax("marcus"), usernameMax("@marcus"), usernameMax("")], [40, 40, 41, 40], "username max: 40, 41 only with a leading @");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
