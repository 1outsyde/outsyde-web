/** Unit tests for the My Tickets helpers. No server needed: npx tsx tests/tickets-logic.test.ts */
import { escapeIcs, buildIcs, icsFileName, splitSections, groupByEvent, placeInfo, whenLine, directionsUrl, errorCopy } from "../app/tickets/ticketsLogic";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}

const mkEvent = (o: Record<string, unknown> = {}) => ({
  id: "e1", slug: "block-party", title: "Block Party", status: "published",
  startsAt: "2026-11-01T01:00:00.000Z", endsAt: "2026-11-01T06:00:00.000Z", timezone: "America/New_York", coverImageUrl: null,
  city: "Freeport", state: "NY", venueName: "The Hall", addressLine1: "12 Main St", addressLine2: null, postalCode: "11520",
  addressHidden: false, addressRevealAt: null, ...o,
}) as any;
const mkTicket = (id: string, ev: any, o: Record<string, unknown> = {}) => ({ id, code: "ABC123", status: "valid", orderId: "o1", checkedInAt: null, ticketTypeName: "GA", qrUrl: "http://x/q.png", event: ev, ...o }) as any;

console.log("escapeIcs");
eq(escapeIcs("a,b;c\\d\ne"), "a\\,b\;c\\\\d\\ne", "escapes comma, semicolon, backslash, newline");
eq(escapeIcs("a\r\nb"), "a\\nb", "CRLF becomes \\n");

console.log("buildIcs");
const NOW = new Date("2026-10-23T12:00:00Z");
const ics = buildIcs(mkTicket("t1", mkEvent({ title: "Fun, Games; More" })), NOW);
eq(ics.includes("UID:t1\r\n"), true, "UID is the ticket id");
eq(ics.includes("DTSTART:20261101T010000Z\r\n"), true, "DTSTART in UTC");
eq(ics.includes("DTEND:20261101T060000Z\r\n"), true, "DTEND in UTC");
eq(ics.includes("DTSTAMP:20261023T120000Z\r\n"), true, "DTSTAMP");
eq(ics.includes("SUMMARY:Fun\\, Games\; More\r\n"), true, "SUMMARY escaped");
eq(ics.includes("URL:https://goutsyde.com/e/block-party\r\n"), true, "URL");
eq(ics.includes("LOCATION:The Hall\\, 12 Main St\\, Freeport\\, NY\r\n"), true, "visible address in LOCATION");
eq(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.trimEnd().endsWith("END:VCALENDAR"), true, "calendar wrapper");
const hid = buildIcs(mkTicket("t2", mkEvent({ addressHidden: true, addressLine1: null, venueName: null })), NOW);
eq(hid.includes("LOCATION:Freeport\\, NY\r\n"), true, "hidden address: only city and state");
eq(hid.includes("12 Main"), false, "hidden address text never appears");
eq(icsFileName(mkEvent()), "block-party.ics", "file name");
eq(buildIcs(mkTicket("t3", mkEvent({ title: "x".repeat(200) })), NOW).split("\r\n").every((l) => l.length <= 75), true, "long lines are folded to 75");

console.log("splitSections");
const past = mkTicket("p", mkEvent({ endsAt: "2026-10-01T00:00:00Z" }));
const up = mkTicket("u", mkEvent({ endsAt: "2026-12-01T00:00:00Z" }));
const s = splitSections([past, up], NOW);
eq([s.upcoming.map((t: any) => t.id), s.past.map((t: any) => t.id)], [["u"], ["p"]], "split by endsAt");
eq(splitSections([mkTicket("x", mkEvent({ endsAt: NOW.toISOString() }))], NOW).past.length, 1, "ends exactly now is past");

console.log("groupByEvent");
const g = groupByEvent([mkTicket("a", mkEvent({ id: "e1" })), mkTicket("b", mkEvent({ id: "e2" })), mkTicket("c", mkEvent({ id: "e1" }))]);
eq(g.map((x: any) => [x.event.id, x.tickets.map((t: any) => t.id)]), [["e1", ["a", "c"]], ["e2", ["b"]]], "grouped by event, first appearance order");

console.log("placeInfo");
eq(placeInfo(mkEvent()), { visible: true, lines: ["The Hall", "12 Main St", "Freeport, NY"], note: null, text: "The Hall, 12 Main St, Freeport, NY" }, "visible address");
const la = placeInfo(mkEvent({ timezone: "America/Los_Angeles", addressHidden: true, addressRevealAt: "2026-11-01T01:30:00Z", venueName: null, addressLine1: null }));
eq(la.visible, false, "hidden not visible");
eq(la.lines, ["Freeport, NY"], "hidden shows city and state");
eq(la.note, "Full address on Saturday, October 31 at 6:30 PM.", "reveal copy in the event's own time zone (Los Angeles)");
eq(placeInfo(mkEvent({ addressHidden: true, venueName: null, addressLine1: null })).note, null, "hidden without reveal time: no note");
eq(placeInfo(mkEvent({ city: null, state: null, venueName: null, addressLine1: null })).lines, [], "nothing known");

console.log("whenLine and directionsUrl");
eq(whenLine(mkEvent()), "Sat, Oct 31 · 9:00 PM", "date and time in event zone");
eq(whenLine(mkEvent({ timezone: "Not/AZone" })), "Sun, Nov 1 · 1:00 AM", "bad zone falls back to UTC");
eq(directionsUrl(mkEvent()), "https://www.google.com/maps/search/?api=1&query=The%20Hall%2C%2012%20Main%20St%2C%20Freeport%2C%20NY", "directions url");
eq(directionsUrl(mkEvent({ addressHidden: true })), null, "no directions when hidden");
eq(directionsUrl(mkEvent({ addressLine1: null })), null, "no directions without a street");

console.log("errorCopy");
eq(errorCopy({ code: "REFUND_WINDOW_CLOSED", error: "Window closed." }), "Window closed.", "backend message wins");
eq(errorCopy({ code: "X" }), "Something went wrong. Try again.", "no message: generic");
eq(errorCopy(null), "Something went wrong. Try again.", "null: generic");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
