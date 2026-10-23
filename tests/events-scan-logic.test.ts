/** Unit tests for the door scanner helpers. No server needed: npx tsx tests/events-scan-logic.test.ts */
import {
  qrToCode, cleanTyped, makeRecent, resultFor, invalidCodeResult, undoneResult, lastScanLabel, scanKey, filterGuests, replaceGuest,
  progressPct, DUPLICATE_WINDOW_MS,
} from "../app/events/[id]/scan/scanLogic";
import type { DoorGuest } from "../app/events/_host/manageLogic";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}
const noDash = (s: string, name: string) => eq(/\s[-–—]\s|[–—]/.test(s), false, `no dash punctuation: ${name}`);

// QR text to code
eq(qrToCode("ABCD1234EFGH5678"), "ABCD1234EFGH5678", "plain code");
eq(qrToCode("  abcd1234efgh5678\n"), "ABCD1234EFGH5678", "trimmed and uppercased");
eq(qrToCode("ABCD1234EFGH567"), null, "15 characters is not a code");
eq(qrToCode("ABCD1234EFGH56789"), null, "17 characters is not a code");
eq(qrToCode("ABCD-1234-EFGH-56"), null, "dashes are not a code");
eq(qrToCode("https://goutsyde.com/t/ABCD1234EFGH5678"), null, "a URL is not a code");
eq(qrToCode("ABCD1234EFGH567É"), null, "non ASCII is not a code");
eq(qrToCode(""), null, "empty");
eq(qrToCode(undefined), null, "not a string");

// typing
eq(cleanTyped("abcd 1234-efgh"), "ABCD1234EFGH", "typed: uppercase, letters and digits only");
eq(cleanTyped("ABCD1234EFGH5678XYZ"), "ABCD1234EFGH5678", "typed: at most 16");

// duplicate window
const recent = makeRecent();
eq(recent.allow("AAAA", 1000), true, "first send allowed");
eq(recent.allow("AAAA", 1000 + DUPLICATE_WINDOW_MS - 1), false, "same code within 3 seconds is suppressed");
eq(recent.allow("BBBB", 1500), true, "another code is allowed right away");
eq(recent.allow("AAAA", 1000 + DUPLICATE_WINDOW_MS), true, "same code again after 3 seconds");
eq(recent.allow("AAAA", 1000 + DUPLICATE_WINDOW_MS + 10), false, "and suppressed again right after");
eq(DUPLICATE_WINDOW_MS, 3000, "window is 3 seconds");

// results
const tz = "America/New_York";
const g = (o: Partial<DoorGuest> = {}): DoorGuest => ({ ticketId: "t1", firstName: "Maya", username: "maya", ticketTypeName: "General admission", checkedInAt: null, checkedInBy: null, ...o });
let r = resultFor(200, { success: true, result: "checked_in", ticket: g({ checkedInAt: "2026-10-25T01:42:00.000Z" }) }, tz);
eq([r.outcome, r.tone, r.title, r.who, r.ticket?.ticketId], ["CHECKED_IN", "ok", "Checked in", "Maya · General admission", "t1"], "success: name and ticket type");
r = resultFor(409, { success: false, code: "ALREADY_CHECKED_IN", error: "Already checked in.", ticket: g({ ticketTypeName: "VIP", checkedInAt: "2026-10-25T01:42:00.000Z", checkedInBy: "Sam" }) }, tz);
eq([r.outcome, r.tone, r.title, r.who, r.detail], ["ALREADY_CHECKED_IN", "warn", "Already checked in", "Maya · VIP", "This ticket was scanned at 9:42 PM by Sam."], "already checked in: time in the event zone and who");
r = resultFor(409, { success: false, code: "ALREADY_CHECKED_IN", error: "Already checked in.", ticket: g({ firstName: null, checkedInAt: "2026-10-25T01:42:00.000Z" }) }, tz);
eq([r.who, r.detail], ["@maya · General admission", "This ticket was scanned at 9:42 PM."], "already checked in without a scanner name");
r = resultFor(409, { success: false, code: "WRONG_EVENT", error: "This ticket is for Other Night.", otherEvent: { id: "o", title: "Other Night" } }, tz);
eq([r.tone, r.title, r.who, r.detail], ["bad", "Not for this event", "Ticket for Other Night", "Ask the guest to open the right ticket in My Tickets."], "wrong event");
r = resultFor(409, { success: false, code: "NOT_PAID", error: "This ticket isn't paid for yet." }, tz);
eq([r.tone, r.title, r.detail], ["bad", "Not paid", "This ticket isn't paid for yet. Do not let it in."], "not paid");
r = resultFor(409, { success: false, code: "NOT_VALID", error: "This ticket is not valid. It was refunded or cancelled." }, tz);
eq([r.tone, r.title, r.detail], ["bad", "Not valid", "This ticket is not valid. It was refunded or cancelled. Do not let it in."], "not valid");
r = resultFor(409, { success: false, code: "CHECKIN_CLOSED", error: "Check in isn't open for this event right now." }, tz);
eq([r.tone, r.title, r.detail], ["warn", "Check in closed", "Check in isn't open for this event right now."], "check in closed shows the backend message");
r = resultFor(400, { success: false, code: "INVALID_CODE", error: "That isn't a valid ticket code." }, tz);
eq([r.outcome, r.tone, r.title], ["INVALID_CODE", "bad", "Invalid code"], "invalid code from the backend");
eq([invalidCodeResult().outcome, invalidCodeResult().title], ["INVALID_CODE", "Invalid code"], "invalid code locally");
r = resultFor(429, { success: false, code: "RATE_LIMITED", error: "Too many scans. Wait a moment and try again." }, tz);
eq([r.tone, r.title, r.detail], ["warn", "Slow down", "Too many scans. Wait a moment and try again."], "rate limited");
r = resultFor(404, { success: false, code: "NOT_FOUND", error: "No ticket found for that code." }, tz);
eq([r.title, r.detail], ["Not found", "No ticket found for that code."], "unknown code");
r = resultFor(404, { success: false, code: "EVENT_NOT_FOUND", error: "Event not found." }, tz);
eq([r.outcome, r.title], ["EVENT_NOT_FOUND", "No access"], "lost access");
r = resultFor(0, null, tz);
eq([r.outcome, r.tone], ["NETWORK", "warn"], "network failure");
r = resultFor(500, { success: false, code: "SERVER_ERROR", error: "Could not check in." }, tz);
eq([r.outcome, r.detail], ["ERROR", "Something went wrong. Try again."], "server error is the generic line");
r = resultFor(409, { success: false, code: "SOMETHING_NEW", error: "A new reason." }, tz);
eq([r.outcome, r.detail], ["ERROR", "A new reason."], "unknown code shows the backend message, never the code");
const all = ["ALREADY_CHECKED_IN", "WRONG_EVENT", "NOT_PAID", "NOT_VALID", "CHECKIN_CLOSED", "INVALID_CODE", "RATE_LIMITED", "NOT_FOUND"]
  .map((c) => resultFor(409, { success: false, code: c, error: "m." }, tz));
eq(new Set(all.map((x) => x.title)).size, all.length, "every outcome has its own title");
for (const x of [...all, resultFor(0, null, tz), invalidCodeResult()]) { noDash(x.title + x.who + x.detail, x.outcome); eq(/[A-Z]{2,}_[A-Z]/.test(x.title + x.detail), false, `no raw code shown: ${x.outcome}`); }
eq(lastScanLabel(resultFor(200, { success: true, ticket: g() }, tz)), "In", "last scans: In");
eq(lastScanLabel(resultFor(409, { code: "ALREADY_CHECKED_IN", ticket: g() }, tz)), "Already in", "last scans: Already in");
eq(lastScanLabel(resultFor(409, { code: "NOT_VALID" }, tz)), "Not valid", "last scans: other title");
const undone = undoneResult(g({ checkedInAt: null }));
eq([undone.outcome, undone.title, undone.who, undone.ticket?.ticketId, lastScanLabel(undone)], ["UNDONE", "Check in undone", "Maya · General admission", "t1", "Undone"], "undone card names the guest");
noDash(undone.title + undone.detail, "UNDONE");
eq(scanKey(resultFor(200, { success: true, ticket: g() }, tz), 1000, 1), "t1:1000:1", "scan key: ticket id, time, sequence");
eq(scanKey(invalidCodeResult(), 1000, 2), "INVALID_CODE:1000:2", "scan key without a ticket uses the outcome");
eq(scanKey(invalidCodeResult(), 1000, 2) === scanKey(invalidCodeResult(), 1000, 3), false, "same outcome at the same time still gets distinct keys");

// guests
const list = [g(), g({ ticketId: "t2", firstName: "Jon", username: "jonny", ticketTypeName: "VIP" }), g({ ticketId: "t3", firstName: null, username: "zed", ticketTypeName: "Free RSVP" })];
eq(filterGuests(list, "").length, 3, "empty search keeps all");
eq(filterGuests(list, "  JON ").map((x) => x.ticketId), ["t2"], "search by first name, any case");
eq(filterGuests(list, "@zed").map((x) => x.ticketId), ["t3"], "search by @username");
eq(filterGuests(list, "vip").map((x) => x.ticketId), ["t2"], "search by ticket type");
eq(replaceGuest(list, g({ ticketId: "t2", firstName: "Jon", checkedInAt: "x" }))[1].checkedInAt, "x", "replace a guest after check in");
eq(progressPct(48, 200), 24, "progress");
eq(progressPct(0, 0), 0, "progress with no guests");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
