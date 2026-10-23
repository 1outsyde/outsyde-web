/** Unit tests for the admin events money helpers. No server needed: npx tsx tests/admin-events-logic.test.ts */
import {
  usd, shortDate, nyMidnightIso, rangeFor, RANGE_PRESETS, bucketOf, BUCKETS, groupByBucket, groupByHost,
  FILTERS, filterOf, filterCounts, filterEvents, matchesSearch, payoutPill, allCopy, type AdminEventRow,
} from "../app/admin/events/_lib/money";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}

const NOW = new Date("2026-10-23T16:00:00Z"); // Fri Oct 23, noon in New York
const day = (n: number) => new Date(NOW.getTime() + n * 86400000).toISOString();
let seq = 0;

type Over = Partial<Omit<AdminEventRow, "host" | "payout" | "recoveriesOwed">> & {
  host?: Partial<AdminEventRow["host"]>;
  payout?: Partial<NonNullable<AdminEventRow["payout"]>> | null;
};
function ev(o: Over = {}): AdminEventRow {
  seq++;
  const base: AdminEventRow = {
    id: `e${seq}`, slug: `s${seq}`, title: `Event ${seq}`, city: "Freeport", state: "NY",
    startsAt: day(-3), endsAt: day(-3 + 0.1), timezone: "America/New_York", status: "published", capacity: 100,
    ticketsSold: 10, ticketsValid: 10, ticketsRefunded: 0,
    salesCents: 20000, refundedCents: 0, hostEarnsCents: 19000, outsydeFeesCents: 2000,
    owedToHostCents: 19000, paidToHostCents: 0, refundsPending: 0,
    recoveriesOwed: { count: 0, amountCents: 0 },
    payoutDueAt: day(-3 + 0.1 + 3), payoutExpectedAt: day(-3 + 0.1 + 3),
    host: { type: "business", id: "b1", name: "Lounge", avatarUrl: null, ownerUsername: "hostb", payoutReady: true, payoutSetup: "ready" },
    payout: { id: `p${seq}`, status: "pending", dueAt: day(-3 + 0.1 + 3), paidAt: null, grossCents: 19000, amountCents: 19000, deductedCents: 0, attempts: 0, lastError: null, holdReason: null },
    payoutStatus: "scheduled",
  };
  const { host, payout, ...rest } = o;
  return {
    ...base, ...rest, host: { ...base.host, ...host },
    payout: payout === null ? null : { ...base.payout!, ...payout },
  } as AdminEventRow;
}
const upcoming = (o: Over = {}) => ev({ startsAt: day(5), endsAt: day(5.1), payoutDueAt: day(8.1), payoutExpectedAt: day(8.1), payout: { dueAt: day(8.1) }, ...o });
const bucket = (e: AdminEventRow) => bucketOf(e, NOW);

console.log("usd");
eq(usd(123456), "$1,234.56", "thousands");
eq(usd(5), "$0.05", "cents only");
eq(usd(0), "$0.00", "zero");
eq(usd(-1250), "-$12.50", "negative");
eq(usd(-5), "-$0.05", "negative cents");
eq(usd(1234567890), "$12,345,678.90", "millions");
eq(usd(1999.6), "$20.00", "fractional cents round to whole cents");
eq(usd(0.4), "$0.00", "under half a cent is zero");
eq(usd(-0.4), "$0.00", "negative zero prints without a sign");
eq(usd(Number.NaN), "$0.00", "NaN is zero");

console.log("shortDate");
eq(shortDate("2026-11-04T17:00:00Z"), "Nov 4", "Mon D");
eq(shortDate("2026-11-05T03:00:00Z"), "Nov 4", "New York day, not UTC day");
eq(shortDate("2026-10-25T01:00:00Z"), "Oct 24", "evening in New York");
eq(shortDate(null), "", "null");
eq(shortDate("nonsense"), "", "invalid");

console.log("nyMidnightIso");
eq(nyMidnightIso(new Date("2026-10-23T16:00:00Z")), "2026-10-23T00:00:00-04:00", "EDT day");
eq(nyMidnightIso(new Date("2026-11-02T17:00:00Z")), "2026-11-02T00:00:00-05:00", "Nov 2 is EST after the change");
eq(nyMidnightIso(new Date("2026-11-01T12:00:00Z")), "2026-11-01T00:00:00-04:00", "Nov 1 midnight was still EDT though the clock is EST by noon");
eq(nyMidnightIso(new Date("2026-11-02T03:00:00Z")), "2026-11-01T00:00:00-04:00", "late Nov 1 in New York is still Nov 1");
eq(nyMidnightIso(new Date("2026-11-02T05:00:00Z")), "2026-11-02T00:00:00-05:00", "05:00Z Nov 2 is exactly midnight EST");
eq(nyMidnightIso(new Date("2026-03-08T12:00:00Z")), "2026-03-08T00:00:00-05:00", "spring forward day starts in EST");
eq(nyMidnightIso(new Date("2026-03-09T12:00:00Z")), "2026-03-09T00:00:00-04:00", "day after spring forward is EDT");
eq(new Date(nyMidnightIso(new Date("2026-11-01T12:00:00Z"))).toISOString(), "2026-11-01T04:00:00.000Z", "parses to the right instant");
eq(new Date(nyMidnightIso(new Date("2026-11-02T17:00:00Z"))).toISOString(), "2026-11-02T05:00:00.000Z", "parses to the right instant after the change");

console.log("rangeFor");
eq(RANGE_PRESETS.map((p) => p.label), ["Last 30 days", "Last 90 days", "This year", "All time"], "preset labels");
eq(rangeFor("last30", NOW), { from: "2026-09-23T00:00:00-04:00" }, "last 30 days");
eq(rangeFor("last90", NOW), { from: "2026-07-25T00:00:00-04:00" }, "last 90 days");
eq(rangeFor("year", NOW), { from: "2026-01-01T00:00:00-05:00" }, "this year uses the January offset");
eq(rangeFor("all", NOW), {}, "all time has no from");
eq(rangeFor("last30", new Date("2026-11-10T17:00:00Z")), { from: "2026-10-11T00:00:00-04:00" }, "30 days back crosses the DST change");
eq(rangeFor("last30", new Date("2026-12-15T17:00:00Z")), { from: "2026-11-15T00:00:00-05:00" }, "winter");

console.log("bucketOf");
eq(bucket(ev({ payout: { status: "review" } })), "now", "review needs you now");
eq(bucket(ev({ payout: { status: "held", holdReason: "no_account" } })), "now", "held needs you now");
eq(bucket(upcoming({ payout: { status: "held", holdReason: "event_paused" } })), "now", "held on a future event still needs you");
eq(bucket(ev({ status: "cancelled", payout: { status: "review" } })), "cancelled", "review on a cancelled event goes to cancelled");
eq(bucket(ev({ status: "cancelled", payout: null, hostEarnsCents: 0, owedToHostCents: 0 })), "cancelled", "cancelled");
eq(bucket(ev({ payout: { status: "paid", paidAt: day(-1) }, paidToHostCents: 19000, owedToHostCents: 0 })), "paid", "paid");
eq(bucket(upcoming()), "upcoming", "not ended is coming up");
eq(bucket(upcoming({ payout: null, salesCents: 0, hostEarnsCents: 0, owedToHostCents: 0, payoutDueAt: null, payoutExpectedAt: null })), "upcoming", "nothing sold and not ended is coming up");
eq(bucket(ev()), "week", "ended, pending, due in the past is overdue so due this week");
eq(bucket(ev({ endsAt: day(-0.1), payoutDueAt: day(2.9), payout: { dueAt: day(2.9) } })), "week", "ended just now, due in 3 days");
eq(bucket(ev({ payoutDueAt: day(7), payout: { dueAt: day(7) } })), "week", "ended, due in 7 days, is in the ended-unpaid bucket");
eq(bucket(ev({ payoutDueAt: day(30), payout: { dueAt: day(30) } })), "week", "ended and unpaid is in the due bucket even if the date is far out");
eq(bucket(ev({ salesCents: 4000, refundedCents: 4000, ticketsRefunded: 2, ticketsValid: 0, hostEarnsCents: 0, owedToHostCents: 0, payout: null })), "nothing", "ended, all sales refunded, no payout");
eq(bucket(ev({ payoutDueAt: day(30), payout: { dueAt: day(30) }, refundsPending: 2 })), "week", "waiting on refunds is in the due bucket");
eq(bucket(ev({ payout: null, payoutDueAt: day(-1), payoutExpectedAt: day(-1) })), "week", "ended, money earned, payout row not made yet");
eq(bucket(ev({ payout: null, salesCents: 0, hostEarnsCents: 0, owedToHostCents: 0, payoutDueAt: null, payoutExpectedAt: null })), "nothing", "ended, nothing sold, no payout");
eq(bucket(ev({ endsAt: day(-0.1) })), "week", "ended 2.4 hours ago");
eq(bucket(upcoming({ startsAt: day(0), endsAt: new Date(NOW.getTime() + 1).toISOString() })), "upcoming", "ends in a millisecond, still coming up");
eq(bucket(ev({ endsAt: NOW.toISOString() })), "week", "ends exactly now counts as ended");
eq(BUCKETS.map((b) => b.name), ["Needs you now", "Ended, payout not sent yet", "Coming up", "Paid", "Ended, nothing to pay", "Cancelled"], "bucket order and names");
eq(BUCKETS.map((b) => b.hint), ["Payouts that are stuck or on hold", "Soonest due first. Overdue ones on top.", "Events that haven't happened yet, soonest first", "Most recent first", "Ended with nothing to pay", "Everyone refunded"], "bucket hints");

console.log("groupByBucket and sorting");
{
  const a = ev({ title: "due late", payoutDueAt: day(2), payout: { dueAt: day(2) } });
  const b = ev({ title: "due early", payoutDueAt: day(-2), payout: { dueAt: day(-2) } });
  const c = ev({ title: "due mid", payoutDueAt: day(0.5), payout: { dueAt: day(0.5) } });
  const u1 = upcoming({ title: "later", startsAt: day(9), endsAt: day(9.1) });
  const u2 = upcoming({ title: "sooner", startsAt: day(2), endsAt: day(2.1) });
  const p1 = ev({ title: "paid old", payout: { status: "paid", paidAt: day(-9) }, owedToHostCents: 0, paidToHostCents: 100 });
  const p2 = ev({ title: "paid new", payout: { status: "paid", paidAt: day(-1) }, owedToHostCents: 0, paidToHostCents: 200 });
  const n1 = ev({ title: "stuck", payout: { status: "review" } });
  const x = ev({ title: "cancelled", status: "cancelled", payout: null });
  const z = ev({ title: "nothing sold ended", payout: null, salesCents: 0, hostEarnsCents: 0, owedToHostCents: 0 });
  const groups = groupByBucket([a, u1, p1, x, b, u2, p2, n1, c, z], NOW);
  eq(groups.map((g) => g.id), ["now", "week", "upcoming", "paid", "nothing", "cancelled"], "all six present in order");
  eq(groups.find((g) => g.id === "week")!.events.map((e) => e.title), ["due early", "due mid", "due late"], "due: soonest payout first");
  eq(groups.find((g) => g.id === "upcoming")!.events.map((e) => e.title), ["sooner", "later"], "coming up: soonest start first");
  eq(groups.find((g) => g.id === "paid")!.events.map((e) => e.title), ["paid new", "paid old"], "paid: most recent first");
  eq(groupByBucket([u1], NOW).map((g) => g.id), ["upcoming"], "empty buckets are dropped");
  eq(groupByBucket([], NOW), [], "no events, no groups");
  eq(groups.find((g) => g.id === "paid")!.totals, { events: 2, salesCents: 40000, owedCents: 0, paidCents: 300 }, "bucket totals");
}

console.log("groupByHost");
{
  const biz = (id: string, name: string) => ({ type: "business" as const, id, name });
  const ph = (id: string, name: string) => ({ type: "photographer" as const, id, name });
  const usr = (id: string, name: string, extra: object = {}) => ({ type: "user" as const, id, name, ...extra });
  const events = [
    ev({ title: "u1", host: usr("u1", "Zed", { payoutReady: false, payoutSetup: "no_account" }) }),
    ev({ title: "p1", host: ph("p1", "Pia") }),
    ev({ title: "b-z", host: biz("b9", "zeta Bar") }),
    ev({ title: "b-a1", host: biz("b2", "Alpha Lounge"), startsAt: day(-10), endsAt: day(-10) }),
    ev({ title: "u2", host: usr("u2", "Amy", { payoutReady: false, payoutSetup: "not_complete" }) }),
    ev({ title: "p0", host: ph("p0", "Abe") }),
    ev({ title: "b-a2", host: biz("b2", "Alpha Lounge"), startsAt: day(-1), endsAt: day(-1) }),
    ev({ title: "u1b", host: usr("u1", "Zed", { payoutReady: false, payoutSetup: "no_account" }) }),
  ];
  const g = groupByHost(events);
  eq(g.map((x) => x.name), ["Alpha Lounge", "zeta Bar", "Abe", "Pia", "Individual hosts"], "businesses, then photographers, each by name, then individuals");
  eq(g.map((x) => x.kind), ["business", "business", "photographer", "photographer", "people"], "kinds");
  eq(g[0].events.map((e) => e.title), ["b-a2", "b-a1"], "events inside a group are newest first");
  eq(g[4].events.length, 3, "all user hosts share one group");
  eq(g[4].hostsNeedingSetup, 2, "two distinct individuals need setup");
  eq(g[0].hostsNeedingSetup, 0, "ready business");
  eq(groupByHost([]), [], "empty");
}
{
  const mk = (o: Over) => ev({ host: { type: "business", id: "bx", name: "Totals Co" }, ...o });
  const rows = [
    mk({ salesCents: 10000, owedToHostCents: 9000, paidToHostCents: 0 }),
    mk({ salesCents: 5000, owedToHostCents: 0, paidToHostCents: 4500, payout: { status: "paid", paidAt: day(-1) } }),
    mk({ salesCents: 3000, status: "cancelled", owedToHostCents: 2800, payout: { status: "review" } }),
    mk({ salesCents: 0, hostEarnsCents: 0, owedToHostCents: 0, payout: null }),
  ];
  const g = groupByHost(rows);
  eq(g[0].totals, { events: 4, salesCents: 18000, owedCents: 9000, paidCents: 4500 }, "group totals: cancelled review payout is not owed");
}

console.log("filters");
{
  const rows = [
    upcoming({ title: "up" }),
    ev({ title: "due" }),
    ev({ title: "stuck", payout: { status: "review" } }),
    ev({ title: "held", payout: { status: "held" } }),
    ev({ title: "paid", payout: { status: "paid", paidAt: day(-1) }, owedToHostCents: 0 }),
    ev({ title: "cx", status: "cancelled", payout: { status: "review" } }),
    ev({ title: "nothing sold done", payout: null, salesCents: 0, hostEarnsCents: 0, owedToHostCents: 0 }),
  ];
  eq(FILTERS.map((f) => f.label), ["All", "Upcoming", "Ended, not paid yet", "Paid", "Needs attention"], "filter labels in order");
  eq(filterCounts(rows, NOW), { all: 7, upcoming: 1, awaiting: 1, paid: 1, attention: 2 }, "counts");
  eq(filterEvents(rows, "attention", NOW).map((e) => e.title), ["stuck", "held"], "needs attention");
  eq(filterEvents(rows, "upcoming", NOW).map((e) => e.title), ["up"], "upcoming");
  eq(filterEvents(rows, "awaiting", NOW).map((e) => e.title), ["due"], "ended not paid yet");
  eq(filterEvents(rows, "paid", NOW).map((e) => e.title), ["paid"], "paid");
  eq(filterEvents(rows, "all", NOW).length, 7, "all");
  eq(filterOf(rows[5], NOW), null, "cancelled sits only in All");
  eq(filterCounts([], NOW), { all: 0, upcoming: 0, awaiting: 0, paid: 0, attention: 0 }, "empty counts");
}

console.log("search");
{
  const e = ev({ title: "Halloween Bash", city: "Long Beach", host: { name: "Lounge Co", ownerUsername: "DJ_Mike" } });
  eq(matchesSearch(e, "halloween"), true, "title, any case");
  eq(matchesSearch(e, "LONG bea"), true, "city");
  eq(matchesSearch(e, "lounge"), true, "host name");
  eq(matchesSearch(e, "dj_mike"), true, "owner username");
  eq(matchesSearch(e, "@dj_mike"), true, "owner username with @");
  eq(matchesSearch(e, "  bash  "), true, "trimmed");
  eq(matchesSearch(e, ""), true, "empty matches all");
  eq(matchesSearch(e, "   "), true, "blank matches all");
  eq(matchesSearch(e, "zzz"), false, "no match");
  eq(matchesSearch(ev({ city: null, host: { ownerUsername: null } }), "freeport"), false, "null fields do not throw");
  const rows = [e, ev({ title: "Other" })];
  eq(filterEvents(rows, "all", NOW, "bash").length, 1, "search combines with filter");
  eq(filterCounts(rows, NOW, "bash").all, 1, "counts follow the search");
}

console.log("payoutPill");
const pill = (e: AdminEventRow) => payoutPill(e, NOW);
eq(pill(upcoming()), { text: `Scheduled ${shortDate(day(8.1))}`, tone: "gold" }, "scheduled");
eq(pill(ev({ payoutDueAt: "2026-10-25T20:00:00Z", payout: { dueAt: "2026-10-25T20:00:00Z" } })), { text: "Due Oct 25", tone: "gold" }, "due");
eq(pill(ev()), { text: `Due ${shortDate(day(-3 + 0.1 + 3))}`, tone: "gold" }, "overdue still says due");
eq(pill(ev({ payout: { status: "paid", paidAt: "2026-10-21T15:00:00Z" } })), { text: "Paid Oct 21", tone: "green" }, "paid");
eq(pill(ev({ payout: { status: "review" } })), { text: "In review", tone: "red" }, "review");
eq(pill(ev({ payout: { status: "held", holdReason: "no_account" }, host: { payoutReady: false, payoutSetup: "no_account" }, payoutStatus: "payout_setup_needed" })), { text: "On hold, setup needed", tone: "red" }, "held, no account");
eq(pill(ev({ payout: { status: "held", holdReason: "not_complete" }, host: { payoutReady: false, payoutSetup: "not_complete" } })), { text: "On hold, setup needed", tone: "red" }, "held, not complete");
eq(pill(ev({ payout: { status: "held", holdReason: "stripe_not_ready" }, host: { payoutReady: false } })), { text: "On hold, setup needed", tone: "red" }, "held, stripe not ready");
eq(pill(ev({ payout: { status: "held", holdReason: "event_paused" } })), { text: "On hold", tone: "red" }, "held, event paused");
eq(pill(ev({ payout: { status: "held", holdReason: null } })), { text: "On hold", tone: "red" }, "held, no reason");
eq(pill(ev({ refundsPending: 1 })), { text: "Waiting on a refund", tone: "grey" }, "waiting on refunds");
eq(pill(ev({ payout: null, salesCents: 0, hostEarnsCents: 0, owedToHostCents: 0 })), { text: "No payout, nothing sold", tone: "grey" }, "nothing sold");
eq(pill(upcoming({ payout: null, salesCents: 0, hostEarnsCents: 0, owedToHostCents: 0, payoutDueAt: null, payoutExpectedAt: null })), { text: "Scheduled", tone: "gold" }, "not ended, nothing sold yet: normal scheduled pill, not nothing-to-pay");
eq(pill(upcoming({ payout: null, salesCents: 0, hostEarnsCents: 0, owedToHostCents: 0 })), { text: `Scheduled ${shortDate(day(8.1))}`, tone: "gold" }, "not ended, no payout row, has a date");
eq(pill(ev({ salesCents: 4000, refundedCents: 4000, hostEarnsCents: 0, owedToHostCents: 0, payout: null, refundsPending: 1 })), { text: "Waiting on a refund", tone: "grey" }, "ended, all refunded but a refund still moving: waiting wins");
{
  const refunded = ev({ salesCents: 4000, refundedCents: 4000, hostEarnsCents: 0, owedToHostCents: 0, payout: null });
  eq(pill(refunded), { text: "No payout, nothing to pay", tone: "grey" }, "ended, all sales refunded: pill agrees with the bucket");
  eq([bucket(refunded), filterOf(refunded, NOW)], ["nothing", null], "all refunded: bucket and filter agree");
}
eq(pill(ev({ status: "cancelled", payout: null })), { text: "None, all refunded", tone: "grey" }, "cancelled");
eq(pill(ev({ status: "cancelled", payout: { status: "pending" } })), { text: "None, all refunded", tone: "grey" }, "cancelled with pending payout");
eq(pill(ev({ status: "cancelled", payout: { status: "review" } })), { text: "Won't be paid, event cancelled", tone: "grey" }, "cancelled review");
eq(pill(ev({ status: "cancelled", payout: { status: "held" } })), { text: "Won't be paid, event cancelled", tone: "grey" }, "cancelled held");
eq(groupByHost([ev({ status: "cancelled", salesCents: 3000, owedToHostCents: 2800, payout: { status: "held" } })])[0].totals.owedCents, 0, "held payout on a cancelled event is not owed");
eq(pill(upcoming({ payout: null, payoutDueAt: null, payoutExpectedAt: null, salesCents: 500 })), { text: "Scheduled", tone: "gold" }, "scheduled with no date does not print a blank");

console.log("copy");
{
  const copy = allCopy();
  eq(copy.length > 25, true, "copy list is populated");
  eq(copy.filter((s) => s.includes(" - ") || s.includes("—") || s.includes("–") || s.includes(" -- ")), [], "no dash breaks in exported copy");
  eq(copy.filter((s) => /\d\s*%/.test(s)), [], "no fee percentages in copy");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
