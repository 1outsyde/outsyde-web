/** Unit tests for the shop checkout payment step (Continue to payment, then Apple Pay or card). npx tsx tests/checkout-pay-logic.test.ts */
import {
  checkoutSignature, payStage, chargedCentsFrom, successQuery, shopApplePayClick, isPaid, paymentAnswer, shownTotals, contactProblem,
} from "../app/checkout/payLogic";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}

const item = (o: Record<string, unknown> = {}) => ({ id: "p1", vendorId: "v1", qty: 1, priceCents: 1875, name: "Tea", vendor: "Lotus", ...o });
const ship = { name: "Ann Lee", address: { line1: "1 Main St", city: "Freeport", state: "NY", postal_code: "11520", country: "US" } };
const base = { items: [item()], shipping: ship, promoCodeId: null as string | null };

console.log("checkoutSignature: anything that changes the order or its total changes the signature");
const sig = checkoutSignature(base);
eq(typeof sig, "string", "is a string");
eq(checkoutSignature({ ...base }), sig, "same inputs: same signature");
eq(checkoutSignature({ ...base, items: [item({ qty: 2 })] }) === sig, false, "quantity changed");
eq(checkoutSignature({ ...base, items: [item({ priceCents: 1900 })] }) === sig, false, "price changed");
eq(checkoutSignature({ ...base, items: [item(), item({ id: "p2" })] }) === sig, false, "item added");
eq(checkoutSignature({ ...base, items: [] }) === sig, false, "cart emptied");
eq(checkoutSignature({ ...base, promoCodeId: "code-1" }) === sig, false, "promo code applied");
eq(checkoutSignature({ ...base, shipping: { ...ship, address: { ...ship.address, line1: "2 Main St" } } }) === sig, false, "shipping street changed");
eq(checkoutSignature({ ...base, shipping: { ...ship, name: "Ann B Lee" } }) === sig, false, "shipping name changed");
eq(checkoutSignature({ ...base, shipping: null }) === sig, false, "no shipping address");
eq(checkoutSignature({ ...base, items: [item({ name: "Renamed" })] }), sig, "display name only: same order, same signature");

console.log("payStage");
eq(payStage(null, sig), "details", "nothing prepared: fill in details");
eq(payStage({ signature: sig }, sig), "payment", "prepared for exactly this order: pay");
eq(payStage({ signature: sig }, sig + "x"), "details", "order changed after Continue: back to details");

console.log("chargedCentsFrom: the server's charge, never the estimate when the server answered");
eq(chargedCentsFrom({ totalChargedToConsumerCents: 2025, amountChargedCents: 1525 }, 9999), 1525, "single shop with a code: amountChargedCents");
eq(chargedCentsFrom({ totalChargedToConsumerCents: 2025 }, 9999), 2025, "multi shop: totalChargedToConsumerCents");
eq(chargedCentsFrom(undefined, 2025), 2025, "no breakdown: fallback");

console.log("successQuery");
eq(successQuery({ itemCount: 3, totalCharged: 2025, pointsEarned: 81, orderId: "o1" }), "itemCount=3&totalCharged=2025&pointsEarned=81&orderId=o1", "single order");
eq(successQuery({ itemCount: 1, totalCharged: 500, pointsEarned: 0, orderGroupId: "g1" }), "itemCount=1&totalCharged=500&pointsEarned=0&orderGroupId=g1", "order group");
eq(successQuery({ itemCount: 1, totalCharged: 500, pointsEarned: 0 }), "itemCount=1&totalCharged=500&pointsEarned=0", "no ids");

console.log("shopApplePayClick: always answer the sheet");
eq(shopApplePayClick({ inFlight: false, stage: "payment" }), "resolve", "on the payment step and idle: open");
eq(shopApplePayClick({ inFlight: true, stage: "payment" }), "reject", "card payment running: refuse");
eq(shopApplePayClick({ inFlight: false, stage: "details" }), "reject", "order changed since Continue: refuse");

console.log("isPaid: only a succeeded PaymentIntent with no error counts as paid");
eq(isPaid({ paymentIntent: { status: "succeeded" } }), true, "succeeded");
eq(isPaid({ paymentIntent: { status: "processing" } }), false, "processing is not paid yet");
eq(isPaid({ paymentIntent: { status: "requires_payment_method" } }), false, "declined");
eq(isPaid({ error: { message: "x" }, paymentIntent: { status: "succeeded" } }), false, "an error never counts as paid");
eq(isPaid(null), false, "no answer");

console.log("chargedCentsFrom: a breakdown with neither field falls back like before");
eq(chargedCentsFrom({} as never, 2025), 2025, "empty breakdown: estimate");

console.log("paymentAnswer: one reading for card, Apple Pay and Stripe's own status");
eq(paymentAnswer({ paymentIntent: { status: "succeeded" } }), "paid", "succeeded");
eq(paymentAnswer({ error: { code: "payment_intent_unexpected_state", payment_intent: { status: "succeeded" } } }), "paid", "already succeeded (paid before, retried): paid, not an error");
eq(paymentAnswer({ error: { code: "payment_intent_unexpected_state", payment_intent: { status: "canceled" } } }), "refresh", "cancelled payment (code taken by another checkout): Continue again");
eq(paymentAnswer({ paymentIntent: { status: "canceled" } }), "refresh", "status cancelled: Continue again");
eq(paymentAnswer({ paymentIntent: { status: "processing" } }), "processing", "processing");
eq(paymentAnswer({ error: { code: "card_declined", payment_intent: { status: "requires_payment_method" } } }), "failed", "declined: try again on the same payment");
eq(paymentAnswer(null), "failed", "no answer");

console.log("shownTotals: the server's numbers where it sent them, the estimate field by field otherwise");
eq(shownTotals(null, { subtotalCents: 3000, feeCents: 240, discountCents: 0, totalCents: 3240 }), { subtotalCents: 3000, feeCents: 240, discountCents: 0, totalCents: 3240 }, "no breakdown: estimate");
eq(shownTotals({ totalChargedToConsumerCents: 3245 }, { subtotalCents: 3000, feeCents: 240, discountCents: 0, totalCents: 3240 }), { subtotalCents: 3000, feeCents: 240, discountCents: 0, totalCents: 3245 }, "multi shop (total only): no NaN, real total");
eq(shownTotals({ basePriceCents: 3000, consumerUpchargeCents: 240, discountCents: 500, amountChargedCents: 2740, totalChargedToConsumerCents: 3240 }, { subtotalCents: 3000, feeCents: 240, discountCents: 400, totalCents: 2840 }), { subtotalCents: 3000, feeCents: 240, discountCents: 500, totalCents: 2740 }, "single shop with a code: server numbers");

console.log("contactProblem: checked again right before paying");
const ok = { email: "a@b.co", phone: "5551234567", billingSame: true, billComplete: false, hasBillAddr: false };
eq(contactProblem(ok), null, "all good");
eq(contactProblem({ ...ok, email: "nope" }), "Please enter a valid email.", "bad email");
eq(contactProblem({ ...ok, phone: "  " }), "Please enter a phone number.", "no phone");
eq(contactProblem({ ...ok, billingSame: false }), "Please complete your billing address.", "billing unchecked and empty");
eq(contactProblem({ ...ok, billingSame: false, billComplete: true, hasBillAddr: true }), null, "separate billing filled in");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
