// Hidden plan offers: pure helpers. Run with: npx tsx tests/plan-offer.test.ts
import {
  acceptLabel,
  adminOfferText,
  bannerText,
  confirmScreen,
  errorScreen,
  formatMoney,
  priceLine,
  shouldShowOfferPrompt,
  type PlanOffer,
} from "../lib/plan-offer";

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.error(`  ❌ ${name}`, detail === undefined ? "" : JSON.stringify(detail)); }
}
const noDash = (t: string) => !/[–—]| - /.test(t);

const base: PlanOffer = {
  id: "o1", plan: "grandfathered", tierId: "t", planName: "Grandfathered", priceInCents: 4099, maxStaff: 8,
  freeExpiresAt: null, permanent: false, createdAt: "2026-10-21T12:00:00Z", businessId: "b", businessName: "Royal Elite",
  username: "benny", outcome: "start_paid", dueTodayCents: 4099, billingStartsAt: null, currentPlanName: null, savedCard: null,
};

console.log("\nWhere the popup shows");
for (const p of ["/", "/account", "/vendor-dashboard", "/explore"]) assert(shouldShowOfferPrompt(p), `shows on ${p}`);
for (const p of ["/admin", "/admin/vendors", "/login", "/plan-offer", "/subscription", "/subscription/success", "/subscribe/free/x", "/shop/royalelite", "/finish", "/claim", "/checkout"]) assert(!shouldShowOfferPrompt(p), `never on ${p}`);
assert(!shouldShowOfferPrompt("/Admin/Vendors"), "case insensitive");
assert(shouldShowOfferPrompt("/administer") && shouldShowOfferPrompt("/shopping"), "only whole path segments are skipped");

console.log("\nWhich confirm screen");
assert(confirmScreen(null) === "gone", "no offer: gone");
assert(confirmScreen({ ...base, plan: "free", outcome: "start_free" }) === "free", "free");
assert(confirmScreen(base) === "nocard", "no saved card: 2b");
assert(confirmScreen({ ...base, savedCard: { brand: "visa", last4: "4242" } }) === "card", "saved card: 2a");
assert(confirmScreen({ ...base, outcome: "start_paid_after_free" }) === "after_free", "dated Free plan: 2c");
assert(confirmScreen({ ...base, outcome: "replace_free_with_paid" }) === "ends_free", "permanent Free plan: 2d");
assert(confirmScreen({ ...base, outcome: "switch_paid" }) === "switch", "paid plan: 2e");
assert(confirmScreen({ ...base, outcome: "paid_plan_late" }) === "late", "late plan: PlanLate");
assert(confirmScreen({ ...base, outcome: "invoice_billed" }) === "invoice", "invoice: InvoiceBilled");
assert(confirmScreen({ ...base, outcome: "already_on_plan" }) === "gone", "already on the plan: OfferGone");

console.log("\nAccept errors");
assert(errorScreen(409, "PLAN_LATE") === "late" && errorScreen(400, "NOT_SWITCHABLE") === "invoice" && errorScreen(409, "OFFER_BUSY") === "busy", "codes map to screens");
assert(errorScreen(409, "OFFER_NOT_AVAILABLE") === "gone" && errorScreen(404, undefined) === "gone", "gone");
assert(errorScreen(402, "PAYMENT_FAILED") === null && errorScreen(500, "SERVER_ERROR") === null, "others show their message");

console.log("\nCopy");
assert(formatMoney(4099) === "$40.99" && formatMoney(null) === "", "money");
assert(acceptLabel("card", base) === "Confirm and pay $40.99" && acceptLabel("nocard", base) === "Add card and confirm" && acceptLabel("switch", base) === "Switch and pay $40.99" && acceptLabel("free", base) === "Claim free plan", "button labels match the canvas");
assert(priceLine({ ...base, plan: "free", permanent: true }) === "Free, no end date", "permanent free line");
assert(priceLine({ ...base, plan: "free", freeExpiresAt: "2027-01-31T04:59:59Z" }) === "Free until January 30, 2027", "dated free line (New York)");
assert(bannerText(base).title === "Your Grandfathered plan is waiting" && bannerText(base).body === "$40.99 a month, reserved for you. Tap to review.", "banner matches the canvas");
assert(adminOfferText(null).text === "No offer", "admin: no offer");
const pend = adminOfferText({ id: "o", plan: "grandfathered", status: "pending", freeExpiresAt: null, permanent: false, createdAt: "2026-10-19T15:00:00Z", acceptedAt: null, withdrawnAt: null });
assert(pend.text === "Grandfathered offer sent October 19, 2026. Waiting for them to accept." && pend.tone === "pending", "admin: pending", pend);
const acc = adminOfferText({ id: "o", plan: "free", status: "accepted", freeExpiresAt: null, permanent: true, createdAt: null, acceptedAt: "2026-10-18T15:00:00Z", withdrawnAt: null });
assert(acc.text === "Free plan, no end date accepted October 18, 2026", "admin: accepted", acc);
const all = JSON.stringify([bannerText(base), bannerText({ ...base, plan: "free", permanent: true }), pend, acc, priceLine({ ...base, plan: "free", permanent: true }), ...(["card", "nocard", "after_free", "ends_free", "switch", "free"] as const).map((s) => acceptLabel(s, base))]);
assert(noDash(all), "no dashes", all);
assert(!/8\s?%|percent/i.test(all), "no fee percentage");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
