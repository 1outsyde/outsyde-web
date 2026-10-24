/**
 * Friend referral invite (Step 3, 2026-10-23).
 * Run with: npx tsx tests/referral.test.ts
 * Rules: 2,500 points each ($5) when the friend's first purchase of $10 or more is final.
 * Copy rules: real punctuation, no dashes, never a percentage, points are Outsyde loyalty rewards.
 */
import { existsSync, readFileSync } from "node:fs";
import { normalizeReferralCode, signupHrefForCode, businessSignupHrefForCode, businessReferralLine, needsPayoutSetup, REFERRAL_COPY, BUSINESS_REFERRAL_COPY } from "../lib/referral";

let passed = 0, failed = 0;
function assert(c: boolean, name: string, d?: unknown) {
  if (c) { passed++; console.log(`  ✅ ${name}`); } else { failed++; console.error(`  ❌ ${name}`, d === undefined ? "" : JSON.stringify(d)); }
}
function visibleText(src: string): string {
  return src
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ");
}
const noDash = (t: string) => !/(—|–| - )/.test(t);
const noPct = (t: string) => !/%/.test(t);

console.log("\n1. Codes");
assert(normalizeReferralCode("ab3k9pq2") === "AB3K9PQ2", "lowercase code is uppercased");
assert(normalizeReferralCode("  AB3K9PQ2 ") === "AB3K9PQ2", "spaces trimmed");
assert(normalizeReferralCode("AB3K-9PQ2") === null, "dash refused");
assert(normalizeReferralCode("<script>") === null, "markup refused");
assert(normalizeReferralCode("A".repeat(21)) === null, "over 20 characters refused");
assert(normalizeReferralCode("") === null && normalizeReferralCode(null) === null && normalizeReferralCode(undefined) === null, "empty or missing refused");
assert(signupHrefForCode("ab3k9pq2") === "/consumer-signup?ref=AB3K9PQ2", "join link carries the code");

assert(businessSignupHrefForCode("ab3k9pq2") === "/business-signup?ref=AB3K9PQ2", "business join link carries the code");

console.log("\n1b. Business referral status lines");
const NOW = new Date("2026-10-24T16:00:00Z");
const base = { businessName: "Shop", qualifiedAt: null, expiresAt: "2027-01-22T16:00:00Z", payout: null };
const pay = (o: Record<string, unknown>) => ({ status: "pending", amountCents: 2500, payableAfter: "2026-10-31T16:00:00Z", paidAt: null, holdReason: null, ...o });
const lines = {
  pending: businessReferralLine({ ...base, status: "pending" }, NOW),
  expired: businessReferralLine({ ...base, status: "expired" }, NOW),
  blocked: businessReferralLine({ ...base, status: "blocked" }, NOW),
  waiting: businessReferralLine({ ...base, status: "qualified", payout: pay({}) }, NOW),
  setup: businessReferralLine({ ...base, status: "qualified", payout: pay({ status: "held", holdReason: "no_account" }) }, NOW),
  stripe: businessReferralLine({ ...base, status: "qualified", payout: pay({ status: "held", holdReason: "stripe_not_ready" }) }, NOW),
  review: businessReferralLine({ ...base, status: "qualified", payout: pay({ status: "review" }) }, NOW),
  paid: businessReferralLine({ ...base, status: "qualified", payout: pay({ status: "paid", paidAt: "2026-10-31T17:00:00Z" }) }, NOW),
  cancelled: businessReferralLine({ ...base, status: "qualified", payout: pay({ status: "cancelled" }) }, NOW),
};
assert(/Jan(uary)? 22/.test(lines.pending) && /live/i.test(lines.pending), "pending: says what's left and the deadline", lines.pending);
assert(/90 days/.test(lines.expired), "expired: names the 90 days", lines.expired);
assert(/doesn't qualify|not eligible/i.test(lines.blocked), "blocked: plain not eligible", lines.blocked);
assert(/\$25/.test(lines.waiting) && /Oct(ober)? 31/.test(lines.waiting), "qualified: $25 and the send date", lines.waiting);
assert(/set up payouts/i.test(lines.setup), "held without account: asks to set up payouts", lines.setup);
assert(/Stripe/.test(lines.stripe), "held at Stripe: says Stripe is checking", lines.stripe);
assert(/\$25 sent/.test(lines.paid) && /Oct(ober)? 31/.test(lines.paid), "paid: $25 sent and when", lines.paid);
assert(lines.review.length > 0 && lines.cancelled.length > 0, "review and cancelled have a line");
for (const [k, v] of Object.entries(lines)) assert(!/(—|–| - )/.test(v) && !/%/.test(v), `line ${k}: no dashes, no percentage`, v);
assert(needsPayoutSetup([{ ...base, status: "qualified", payout: pay({ status: "held", holdReason: "not_complete" }) }]), "not_complete hold needs payout setup");
assert(!needsPayoutSetup([{ ...base, status: "qualified", payout: pay({ status: "held", holdReason: "stripe_not_ready" }) }, { ...base, status: "pending" }]), "Stripe check or pending: no setup button");

console.log("\n2. Copy");
for (const [k, v] of Object.entries({ ...REFERRAL_COPY, ...BUSINESS_REFERRAL_COPY })) {
  assert(noDash(v) && noPct(v), `copy ${k}: no dashes, no percentage`, v);
}
assert(REFERRAL_COPY.offer.includes("2,500") && REFERRAL_COPY.offer.includes("$5") && REFERRAL_COPY.offer.includes("$10"), "offer names 2,500 points, $5 and the $10 minimum");
assert(/loyalty rewards/i.test(REFERRAL_COPY.offer), "offer calls points Outsyde loyalty rewards");

console.log("\n3. Pages");
const landing = "app/r/[code]/page.tsx";
assert(existsSync(landing), "landing page exists");
if (existsSync(landing)) {
  const src = readFileSync(landing, "utf8");
  assert(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/.test(src), "landing page is noindex");
  assert(src.includes("normalizeReferralCode") && src.includes("signupHrefForCode"), "landing page validates the code and builds the join link");
  assert(!/cookies\(\)|document\.cookie|set-cookie/i.test(src), "landing page sets no cookie");
  const t = visibleText(src.replace(/const css = `[\s\S]*?`;/, " "));
  assert(noDash(t) && noPct(t), "landing copy: no dashes, no percentage", t.match(/.{0,30}(—|–| - |%).{0,30}/)?.[0]);
  assert(!/in the app\? Enter code/.test(src), "landing page doesn't promise an app code field before the app update");
  assert(src.includes("businessSignupHrefForCode"), "landing page offers the business signup with the code");
}
const signup = readFileSync("app/consumer-signup/page.tsx", "utf8");
assert(/referralCode/.test(signup) && /normalizeReferralCode/.test(signup), "signup reads and validates the code");
assert(/\.\.\.\(referralCode \? \{ referralCode \} : \{\}\)/.test(signup), "signup sends referralCode only when there is one");
const points = readFileSync("app/account/points/page.tsx", "utf8");
assert(points.includes("/api/account/referral"), "points page loads the invite card");
const bff = "app/api/account/referral/route.ts";
assert(existsSync(bff) && readFileSync(bff, "utf8").includes('proxyToBackend("/api/referral/code"'), "invite BFF proxies /api/referral/code");
assert(readFileSync(bff, "utf8").includes("backendAuthHeaders(req)") && !/status:\s*401/.test(readFileSync(bff, "utf8")), "invite BFF forwards cookie sessions too, no early 401");

console.log("\n4. Business referral pages");
const bizBff = "app/api/account/business-referrals/route.ts";
assert(existsSync(bizBff), "business referral BFF exists");
if (existsSync(bizBff)) {
  const b = readFileSync(bizBff, "utf8");
  assert(b.includes('proxyToBackend("/api/referral/business"') && b.includes("backendAuthHeaders(req)") && !/status:\s*401/.test(b), "business BFF proxies /api/referral/business with cookie or token");
}
const bizSignup = readFileSync("app/business-signup/page.tsx", "utf8");
assert(/normalizeReferralCode/.test(bizSignup) && /useSyncExternalStore/.test(bizSignup), "business signup reads ?ref safely");
assert(/\.\.\.\(referralCode \? \{ referralCode \} : \{\}\)/.test(bizSignup), "business signup sends referralCode only when there is one");
assert(bizSignup.includes("BUSINESS_REFERRAL_COPY.fieldLabel") && BUSINESS_REFERRAL_COPY.fieldLabel === "Referral code (optional)", "business signup has the optional field");
const bizRoute = readFileSync("app/api/business-signup/route.ts", "utf8");
assert(/referralCode/.test(bizRoute) && /referralApplied/.test(bizRoute), "business signup route forwards the code and passes referralApplied back");
const card = "components/referral/BusinessReferralCard.tsx";
assert(existsSync(card), "business referral card exists");
if (existsSync(card)) {
  const c = readFileSync(card, "utf8");
  assert(c.includes("/api/account/business-referrals") && c.includes("/api/events/payouts/setup-link") && c.includes("stripeUrl("), "card loads the list and opens a checked Stripe link");
  const ct = visibleText(c.replace(/const css = `[\s\S]*?`;/, " "));
  assert(noDash(ct) && noPct(ct), "card copy: no dashes, no percentage", ct.match(/.{0,30}(—|–| - |%).{0,30}/)?.[0]);
}
assert(points.includes("BusinessReferralCard"), "points page shows the business card");
assert(readFileSync("app/vendor-dashboard/page.tsx", "utf8").includes("BusinessReferralCard"), "vendor dashboard shows the business card");
const payoutsPage = readFileSync("app/events/payouts/page.tsx", "utf8");
assert(/referral rewards/.test(payoutsPage) && payoutsPage.includes("/account/points"), "payouts page is neutral and links to rewards");
assert(readFileSync("lib/plan-offer.ts", "utf8").includes('"/r"'), "plan offer popup skips /r");

console.log("\n4. App link ordering");
const aasa = readFileSync("public/.well-known/apple-app-site-association", "utf8");
assert(!aasa.includes("/r"), "iPhone app links do not claim /r/ yet (the app can't open them until its update ships)");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
