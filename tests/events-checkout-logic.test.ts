/** Unit tests for the paid checkout decisions. No server needed: npx tsx tests/events-checkout-logic.test.ts */
import { money as fmtMoney, errorCopy as sharedErr, clampQty as clampQ } from "../app/e/_shared/format";
import {
  hasStarted,
  phaseForOrder, holdPhase, entryDecision, paramsKey, confirmOutcome, afterRetrieve, lateCopy, storageKey, parseSaved, storageAfterPhase, shouldQuietRestart, unavailableFrom,
  applePayElementsOptions, applePayButtonOptions, canOpenApplePay,
} from "../app/e/[slug]/checkoutLogic";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}

const ID = "11111111-2222-3333-4444-555555555555";
const mkType = (o: Record<string, unknown> = {}) => ({ id: ID, name: "GA", description: null, priceCents: 2000, serviceFeeCents: 259, buyerTotalCents: 2259, salesStatus: "on_sale", remaining: 10, salesStartAt: null, salesEndAt: null, minPerOrder: null, maxPerOrder: 4, perAccountLimit: null, ...o }) as any;
const ev = { status: "published", startsAt: new Date(Date.now() + 86400000).toISOString(), endsAt: new Date(Date.now() + 2 * 86400000).toISOString() } as any;
const NOW = Date.now();

console.log("phaseForOrder");
eq(phaseForOrder("completed", "confirming"), "done", "completed -> done");
eq(phaseForOrder("expired", "confirming"), "closed", "expired -> closed");
eq(phaseForOrder("cancelled", "confirming"), "closed", "cancelled -> closed");
eq(phaseForOrder("refunding", "confirming"), "refunded", "refunding (repeat key) -> refunded");
eq(phaseForOrder("refunded", "confirming"), "refunded", "refunded (repeat key) -> refunded");
eq(phaseForOrder("pending", "confirming"), "confirming", "pending keeps confirming");
eq(phaseForOrder(undefined, "confirming"), "confirming", "unknown keeps confirming");

console.log("hold timer");
eq(holdPhase(1000, 2000), "holding", "before expiry: holding");
eq(holdPhase(2000, 2000), "hold-ended", "at zero: hold-ended");
eq(holdPhase(3000, 2000), "hold-ended", "past zero: hold-ended");

console.log("entry decision");
const ok = { checkout: ID, qty: "2" };
eq(entryDecision(ok, ev, [mkType()], NOW)?.qty, 2, "valid params give the type and qty");
eq(entryDecision({ checkout: null, qty: "2" }, ev, [mkType()], NOW), null, "missing checkout ignored");
eq(entryDecision({ checkout: "nope", qty: "2" }, ev, [mkType()], NOW), null, "non UUID ignored");
eq(entryDecision({ checkout: ID, qty: null }, ev, [mkType()], NOW), null, "missing qty ignored");
eq(entryDecision({ checkout: ID, qty: "abc" }, ev, [mkType()], NOW), null, "non integer qty ignored");
eq(entryDecision({ checkout: ID, qty: "1.5" }, ev, [mkType()], NOW), null, "decimal qty ignored");
eq(entryDecision({ checkout: ID, qty: "0" }, ev, [mkType()], NOW), null, "qty 0 ignored");
eq(entryDecision({ checkout: ID, qty: "9999" }, ev, [mkType()], NOW), null, "4 digit qty ignored");
eq(entryDecision(ok, ev, [], NOW), null, "unknown type ignored");
eq(entryDecision(ok, ev, [mkType({ salesStatus: "sold_out" })], NOW), null, "sold out type ignored");
eq(entryDecision(ok, ev, [mkType({ priceCents: 0 })], NOW), null, "free type ignored");
eq(entryDecision(ok, { ...ev, status: "draft" }, [mkType()], NOW), null, "draft event ignored");
eq(entryDecision(ok, { ...ev, status: "cancelled" }, [mkType()], NOW), null, "cancelled event ignored");
eq(entryDecision(ok, { ...ev, startsAt: new Date(NOW - 3 * 3600000).toISOString(), endsAt: new Date(NOW - 1000).toISOString() }, [mkType()], NOW), null, "ended event ignored");
eq(entryDecision(ok, { ...ev, startsAt: new Date(NOW - 3600000).toISOString(), endsAt: new Date(NOW + 2 * 3600000).toISOString() }, [mkType()], NOW), null, "started but not ended event ignored");
eq(entryDecision(ok, { ...ev, startsAt: new Date(NOW).toISOString() }, [mkType()], NOW), null, "starts exactly now ignored");
eq(hasStarted({ startsAt: new Date(NOW + 1000).toISOString() }, NOW), false, "future start: not started");
eq(hasStarted({ startsAt: new Date(NOW - 1000).toISOString() }, NOW), true, "past start: started");
eq(hasStarted({ startsAt: new Date(NOW).toISOString() }, NOW), true, "start == now: started");
eq(entryDecision({ checkout: ID, qty: "50" }, ev, [mkType()], NOW)?.qty, 4, "qty clamped to max per order");
eq(entryDecision({ checkout: ID, qty: "3" }, ev, [mkType({ remaining: 2 })], NOW)?.qty, 2, "qty clamped to remaining");
eq(entryDecision({ checkout: ID, qty: "1" }, ev, [mkType({ minPerOrder: 2 })], NOW)?.qty, 2, "qty raised to min per order");

console.log("frozen entry decision (the refresh after paying)");
// Before paying: 2 seats of 2 remaining, qty 2. After paying the refreshed data says remaining 0 and sold_out.
const before = entryDecision(ok, ev, [mkType({ remaining: 2 })], NOW);
const after = entryDecision(ok, ev, [mkType({ remaining: 0, salesStatus: "sold_out" })], NOW);
eq(before?.qty, 2, "before the refresh the entry is qty 2");
eq(after, null, "a fresh decision after the refresh would be null (so the host must not re-run it)");
eq(paramsKey(ok), paramsKey({ checkout: ID, qty: "2" }), "same params give the same key, so the frozen checkout is kept");
eq(paramsKey(ok) === paramsKey({ checkout: ID, qty: "3" }), false, "different params give a different key");
// qty clamps change with remaining, but the key only uses the URL params
eq(paramsKey(ok), `${ID}|2`, "key is the raw URL params, never a live clamped qty");

console.log("confirm result mapping");
eq(confirmOutcome({ paymentIntentStatus: "succeeded" }), { next: "confirming", pi: "succeeded" }, "succeeded -> confirming");
eq(confirmOutcome({ paymentIntentStatus: "processing" }), { next: "confirming", pi: "processing" }, "processing -> confirming");
eq(confirmOutcome({ paymentIntentStatus: "requires_payment_method" }), { next: "holding", showStripeError: false }, "other status -> stay on the form");
eq(confirmOutcome({ error: { code: "card_declined" } }), { next: "holding", showStripeError: true }, "card declined -> stay and show Stripe's message");
eq(confirmOutcome({ thrown: true }), { next: "check-payment" }, "thrown confirm error -> check the payment");
eq(confirmOutcome({ error: { code: "payment_intent_unexpected_state" } }), { next: "check-payment" }, "payment_intent_unexpected_state -> check the payment");
eq(confirmOutcome({ error: { code: "payment_intent_unexpected_state", payment_intent: { status: "succeeded" } } }), { next: "confirming", pi: "succeeded" }, "error carrying a succeeded intent -> confirming");
eq(confirmOutcome({ error: { code: "x", payment_intent: { status: "processing" } } }), { next: "confirming", pi: "processing" }, "error carrying a processing intent -> confirming");
eq(afterRetrieve("succeeded"), "confirming-succeeded", "retrieve succeeded -> confirming");
eq(afterRetrieve("processing"), "confirming-processing", "retrieve processing -> confirming");
eq(afterRetrieve("requires_payment_method"), "retry-same", "retrieve unpaid -> ask the backend again with the same key");
eq(afterRetrieve(undefined), "retry-same", "retrieve failed -> ask the backend again with the same key");

console.log("3 minute fallback copy");
eq(lateCopy("succeeded"), "Your payment went through. Your tickets will appear in My Tickets in a few minutes.", "succeeded copy");
eq(lateCopy("processing"), "Your payment is processing. Your tickets will appear in My Tickets once it clears.", "processing copy");
eq(/went through/.test(lateCopy("processing")) || /went through/.test(lateCopy(null)), false, "went through only for succeeded");
for (const v of ["succeeded", "processing", null] as const) eq(/[-–—]/.test(lateCopy(v)), false, `no dashes in late copy (${v})`);

console.log("saved checkout (refresh safety)");
eq(storageKey("e", "t", 2), "co:e:t:2", "storage key");
eq(parseSaved(null), null, "nothing saved");
eq(parseSaved("{nope"), null, "bad JSON ignored");
eq(parseSaved(JSON.stringify({ key: "k", stage: "holding" })), { key: "k", orderId: undefined, stage: "holding", pi: null }, "holding saved");
eq(parseSaved(JSON.stringify({ key: "k", stage: "confirming" })), null, "confirming without an order id is ignored");
eq(parseSaved(JSON.stringify({ key: "k", stage: "confirming", orderId: "o", pi: "processing" }))?.pi, "processing", "confirming keeps pi");

console.log("saved entry per phase");
for (const ph of ["done", "refunded", "closed"] as const) eq(storageAfterPhase(ph), "clear", `${ph} clears the saved entry`);
for (const ph of ["holding", "confirming", "late", "paying", "starting", "hold-error", "hold-ended", "unavailable"] as const) eq(storageAfterPhase(ph), "keep", `${ph} keeps the saved entry`);
eq(storageAfterPhase(phaseForOrder("completed", "confirming")), "clear", "repeat key returning a completed order clears");
eq(storageAfterPhase(phaseForOrder("refunded", "confirming")), "clear", "repeat key returning a refunded order clears");
eq(storageAfterPhase(phaseForOrder("pending", "confirming")), "keep", "pending order keeps");

console.log("one time quiet restart");
eq(shouldQuietRestart("CHECKOUT_CLOSED", true, false), true, "stored key + CHECKOUT_CLOSED -> restart quietly");
eq(shouldQuietRestart("IDEMPOTENCY_KEY_REUSED", true, false), true, "stored key + IDEMPOTENCY_KEY_REUSED -> restart quietly");
eq(shouldQuietRestart("CHECKOUT_CLOSED", true, true), false, "second time: show the message");
eq(shouldQuietRestart("CHECKOUT_CLOSED", false, false), false, "fresh key (not from storage): show the message");
eq(shouldQuietRestart("SOLD_OUT", true, false), false, "other codes never restart");
eq(shouldQuietRestart("", true, false), false, "no code never restarts");

console.log("failed Stripe load");
eq(unavailableFrom("starting"), "unavailable", "starting -> unavailable");
for (const ph of ["confirming", "done", "late", "closed", "refunded", "holding", "paying", "hold-error", "hold-ended"] as const) eq(unavailableFrom(ph), ph, `${ph} is left alone`);

console.log("shared format");
eq(fmtMoney(2000), "$20.00", "whole dollars show cents");
eq(fmtMoney(1999), "$19.99", "cents");
eq(sharedErr(500, { code: "SOLD_OUT" }), "These tickets are sold out.", "known code wins");
eq(sharedErr(502, { error: "Could not reach server." }), "Something went wrong. Try again.", "no code: generic");
eq(clampQ({ minPerOrder: 2, maxPerOrder: 6, remaining: 4, perAccountLimit: null }, 9), 4, "clamp to the smallest cap");
eq(clampQ({ minPerOrder: 2, maxPerOrder: 6, remaining: 4, perAccountLimit: null }, 1), 2, "clamp to min");

console.log("Apple Pay (goutsyde.com, Apple Pay only)");
eq(applePayElementsOptions(2259), { mode: "payment", amount: 2259, currency: "usd" }, "sheet amount = the hold total the PaymentIntent charges");
eq(applePayElementsOptions(0), null, "nothing to charge: no Apple Pay");
eq(applePayElementsOptions(-5), null, "negative total: no Apple Pay");
eq(applePayElementsOptions(22.5), null, "fractional cents: no Apple Pay");
eq(
  applePayButtonOptions().paymentMethods,
  { applePay: "auto", googlePay: "never", link: "never", paypal: "never", amazonPay: "never", klarna: "never" },
  "only Apple Pay can show; every other wallet is off",
);
eq(applePayButtonOptions().buttonTheme, { applePay: "white" }, "white button on the dark checkout");
eq(applePayButtonOptions().buttonType, { applePay: "buy" }, "Buy with Apple Pay");
eq(canOpenApplePay({ paying: false, remainingMs: 60_000 }), true, "held and idle: Apple Pay opens");
eq(canOpenApplePay({ paying: true, remainingMs: 60_000 }), false, "a payment is already running: no second one");
eq(canOpenApplePay({ paying: false, remainingMs: 0 }), false, "hold ended: no Apple Pay");
eq(canOpenApplePay({ paying: false, remainingMs: -1 }), false, "hold past due: no Apple Pay");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
