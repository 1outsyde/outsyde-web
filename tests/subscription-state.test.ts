/**
 * Paid plan state copy — run with: npx tsx tests/subscription-state.test.ts
 * Pure functions only.
 */
import { describePaidPlan, switchChargeNote, isPlanLive } from "../lib/subscription-state";

let passed = 0, failed = 0;
function assert(c: boolean, name: string, d?: unknown) {
  if (c) { passed++; console.log(`  ✅ ${name}`); } else { failed++; console.error(`  ❌ ${name}`, d === undefined ? "" : JSON.stringify(d)); }
}
const noDash = (s: string | null) => !s || !/[–—]| - /.test(s);

const active = describePaidPlan({ status: "active", currentPeriodEnd: "2026-11-17T23:43:52Z" });
assert(active.kind === "active" && active.pill === "Active" && active.showRenewal && active.note === null, "active: Active pill, renewal shown");

const late = describePaidPlan({ status: "past_due", graceEndsAt: "2026-10-23T12:00:00.000Z" });
assert(late.kind === "late" && late.pill === "Payment late" && !late.showRenewal, "late: Payment late pill, renewal hidden", late);
assert(late.note!.includes("by Friday, October 23"), "late: names the day listings pause", late.note);

const lateNoDate = describePaidPlan({ status: "past_due" });
assert(lateNoDate.note!.includes("payment soon"), "late without a date: says soon (older backend)", lateNoDate.note);

const paused = describePaidPlan({ status: "past_due", listingsPaused: true });
assert(paused.kind === "paused" && paused.pill === "Paused" && !paused.showRenewal, "paused wins over late", paused);

const canceled = describePaidPlan({ status: "canceled" });
assert(canceled.kind === "other" && canceled.pill === "Canceled", "other statuses: readable label", canceled);
const weird = describePaidPlan({ status: "incomplete_expired" });
assert(weird.pill === "Incomplete expired", "underscores become spaces", weird);

assert(switchChargeNote({ currentIsPaid: true, currentStatus: "active", targetPriceInCents: 5900 }) ===
  "You'll be charged $59.00 today and your billing date moves to today. There's no credit for time left on your current plan.", "switch note: full price today, no credit");
assert(switchChargeNote({ currentIsPaid: false, currentStatus: "active", targetPriceInCents: 5900 }) === null, "no switch note from a free plan (that is a new checkout)");
assert(switchChargeNote({ currentIsPaid: true, currentStatus: "past_due", targetPriceInCents: 5900 }) === null, "no switch note when late (that is a new checkout)");
assert(switchChargeNote({ currentIsPaid: true, currentStatus: "active", targetPriceInCents: 0 }) === null, "no switch note for a free target");

assert(isPlanLive("active") && isPlanLive("trialing") && !isPlanLive("past_due") && !isPlanLive(undefined), "success page: active and trialing are live");

for (const s of [active.note, late.note, lateNoDate.note, paused.note, switchChargeNote({ currentIsPaid: true, currentStatus: "active", targetPriceInCents: 4099 })]) {
  assert(noDash(s) && !/8\s?%/.test(s ?? ""), "copy has no dashes and no fee percentage", s);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
