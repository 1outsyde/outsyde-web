/** Unit tests for the /events list helpers. No server needed: npx tsx tests/events-list-logic.test.ts */
import { tonightRange, weekendRange, buildQuery, whenLabel, priceLabel, whereLabel, zonedInstant } from "../app/events/eventsLogic";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}
const NY = "America/New_York";

console.log("zonedInstant");
eq(zonedInstant(2026, 10, 23, 23, 59, 59, NY).toISOString(), "2026-10-24T03:59:59.000Z", "EDT is UTC-4");
eq(zonedInstant(2026, 11, 2, 0, 0, 0, NY).toISOString(), "2026-11-02T05:00:00.000Z", "EST is UTC-5 after the change");

console.log("tonight");
// Fri Oct 23 2026, 2:00 PM EDT
eq(tonightRange(new Date("2026-10-23T18:00:00Z"), NY), { from: "2026-10-23T18:00:00.000Z", to: "2026-10-24T03:59:59.000Z" }, "now to local 23:59:59");
// 11:30 PM EDT Oct 23 = Oct 24 03:30Z, still the 23rd locally
eq(tonightRange(new Date("2026-10-24T03:30:00Z"), NY).to, "2026-10-24T03:59:59.000Z", "late evening still ends at local midnight");
eq(tonightRange(new Date("2026-10-23T18:00:00Z"), "Asia/Tokyo").to, "2026-10-24T14:59:59.000Z", "other zone: it is already the 24th in Tokyo");

console.log("this weekend");
// Tue Oct 20 2026 noon EDT -> Fri Oct 23 17:00 EDT to Sun Oct 25 23:59:59 EDT
eq(weekendRange(new Date("2026-10-20T16:00:00Z"), NY), { from: "2026-10-23T21:00:00.000Z", to: "2026-10-26T03:59:59.000Z" }, "Tuesday: coming weekend");
// Fri Oct 23 2026 noon EDT, before 5 PM
eq(weekendRange(new Date("2026-10-23T16:00:00Z"), NY).from, "2026-10-23T21:00:00.000Z", "Friday before 5 PM: starts at 5 PM");
// Fri Oct 23 2026 6:00 PM EDT, inside
eq(weekendRange(new Date("2026-10-23T22:00:00Z"), NY).from, "2026-10-23T22:00:00.000Z", "Friday after 5 PM: starts now");
// Sat Oct 24 10:00 AM EDT
eq(weekendRange(new Date("2026-10-24T14:00:00Z"), NY), { from: "2026-10-24T14:00:00.000Z", to: "2026-10-26T03:59:59.000Z" }, "Saturday: from now to Sunday night");
// Sun Oct 25 2026 8 PM EDT
eq(weekendRange(new Date("2026-10-26T00:00:00Z"), NY).to, "2026-10-26T03:59:59.000Z", "Sunday: ends tonight");
// Mon Oct 26 -> next weekend Fri Oct 30 17:00 EDT to Sun Nov 1 23:59:59 EDT (the clocks change on Nov 1 at 2 AM, so EST at the end)
eq(weekendRange(new Date("2026-10-26T16:00:00Z"), NY), { from: "2026-10-30T21:00:00.000Z", to: "2026-11-02T04:59:59.000Z" }, "Monday: coming weekend across the DST change");

console.log("buildQuery");
const now = new Date("2026-10-23T18:00:00Z");
const none = { near: false, free: false, when: null } as const;
eq(buildQuery({ filters: none, now, tz: NY }), "limit=20", "no filters");
eq(buildQuery({ filters: { ...none, free: true }, now, tz: NY }), "free=true&limit=20", "free");
eq(buildQuery({ filters: { ...none, near: true }, now, tz: NY, coords: { lat: 40.65, lng: -73.58 } }), "lat=40.65&lng=-73.58&radiusKm=40&limit=20", "near me");
eq(buildQuery({ filters: { ...none, near: true }, now, tz: NY, coords: null }), "limit=20", "near me without a location sends nothing");
eq(buildQuery({ filters: { ...none, when: "tonight" }, now, tz: NY, cursor: "abc" }), "from=2026-10-23T18%3A00%3A00.000Z&to=2026-10-24T03%3A59%3A59.000Z&limit=20&cursor=abc", "tonight with cursor");

console.log("whenLabel");
eq(whenLabel({ startsAt: "2026-10-23T23:30:00Z", timezone: NY }, now), "TONIGHT · 7:30 PM", "same day in the event zone");
eq(whenLabel({ startsAt: "2026-10-26T01:00:00Z", timezone: NY }, now), "SUN, OCT 25 · 9:00 PM", "later date");
eq(whenLabel({ startsAt: "2026-10-26T01:00:00Z", timezone: "America/Los_Angeles" }, now), "SUN, OCT 25 · 6:00 PM", "uses the event's zone");

console.log("priceLabel");
eq(priceLabel({ priceFromCents: null, hasFree: true, soldOut: false }), "Free RSVP", "free only");
eq(priceLabel({ priceFromCents: 2000, hasFree: false, soldOut: false }), "From $20", "paid");
eq(priceLabel({ priceFromCents: 2550, hasFree: false, soldOut: false }), "From $25.50", "paid with cents");
eq(priceLabel({ priceFromCents: 2000, hasFree: true, soldOut: false }), "Free RSVP or from $20", "free and paid");
eq(priceLabel({ priceFromCents: 2000, hasFree: false, soldOut: true }), "Sold out", "sold out wins");
eq(priceLabel({ priceFromCents: null, hasFree: false, soldOut: false }), "", "nothing to say");

console.log("whereLabel");
eq(whereLabel({ venueName: "The Hall", city: "Freeport", state: "NY", addressHidden: false }), "The Hall · Freeport, NY", "venue and city");
eq(whereLabel({ venueName: null, city: "Freeport", state: "NY", addressHidden: true }), "Freeport, NY", "hidden address keeps city");
eq(whereLabel({ venueName: null, city: null, state: null, addressHidden: true }), "Address shared with ticket holders", "hidden, no city");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
