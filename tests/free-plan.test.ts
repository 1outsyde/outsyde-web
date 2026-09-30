/**
 * Free-plan web helpers — run with: npx tsx tests/free-plan.test.ts
 * Pure functions only: no network, no React.
 */

import {
  claimLinkStatus,
  describeFreePlanEnd,
  errorHint,
  etEndOfDayIso,
  etToday,
  formatEtDate,
  isAfterEtToday,
  isComplimentarySubscription,
  isPermanentEnd,
  planLabel,
  SYNC_HINT,
  type AdminSubscriptionSummary,
} from "../lib/free-plan";
import { readJsonSafe, UNEXPECTED_RESPONSE_MESSAGE } from "../lib/read-json-safe";
import { safeReturn } from "../lib/safe-return";

let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail?: unknown) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name}`, detail === undefined ? "" : JSON.stringify(detail));
  }
}

const NOW = new Date("2026-09-30T16:00:00Z"); // Sep 30, 2026, noon in New York

function free(over: Partial<AdminSubscriptionSummary>): AdminSubscriptionSummary {
  return {
    tierName: "waived",
    tierDisplayName: "Waived",
    isComplimentary: true,
    status: "active",
    currentPeriodEnd: "2099-01-01T00:00:00.000Z",
    hasStripeSubscription: false,
    ...over,
  };
}
function paid(name: string, display: string, status: string): AdminSubscriptionSummary {
  return { tierName: name, tierDisplayName: display, isComplimentary: false, status, currentPeriodEnd: "2026-10-17T00:00:00.000Z", hasStripeSubscription: true };
}
const connected = { hasConnectAccount: true, stripeOnboardingComplete: true };

(async () => {
  // ── labels ───────────────────────────────────────────────────────────────
  console.log("\nTest 1: plan label (admin vendors page)");
  let l = planLabel({ subscription: free({}), ...connected }, NOW);
  assert(l.text === "Free — permanent" && l.kind === "free" && l.end === "permanent", "permanent: end 2099-01-01Z → \"Free — permanent\"", l);
  assert(!/2098|2099/.test(l.text ?? ""), "permanent is tested BEFORE formatting (never \"December 31, 2098\")");
  assert(formatEtDate("2099-01-01T00:00:00.000Z") === "December 31, 2098", "…which is what formatting it would have said");
  l = planLabel({ subscription: free({ currentPeriodEnd: "2026-12-31T04:59:59.000Z" }), ...connected }, NOW);
  assert(l.text === "Free until December 30, 2026", "dated: Dec 31 04:59:59Z is Dec 30 11:59:59 PM New York", l.text);
  l = planLabel({ subscription: free({ status: "canceled", currentPeriodEnd: "2026-09-29T14:00:00.000Z" }), ...connected }, NOW);
  assert(l.text === "Free plan ended September 29, 2026" && l.end === "ended" && !l.activeFree, "ended by status (revoked)", l.text);
  l = planLabel({ subscription: free({ status: "active", currentPeriodEnd: "2026-09-01T03:59:59.000Z" }), ...connected }, NOW);
  assert(l.text === "Free plan ended August 31, 2026" && l.end === "ended", "ended by date even though status still says active (formatted in New York)", l.text);
  l = planLabel({ subscription: free({ status: "canceled", currentPeriodEnd: null }), ...connected }, NOW);
  assert(l.text === "Free plan ended", "ended with no date");
  l = planLabel({ subscription: free({ currentPeriodEnd: "2026-09-30T16:00:00.000Z" }), ...connected }, NOW);
  assert(l.end === "ended", "an end exactly now counts as ended");

  console.log("\nTest 2: paid rows and no subscription are unchanged");
  const paidRows: Array<[string, AdminSubscriptionSummary, string]> = [
    ["BWL", paid("grandfathered", "Grandfathered", "active"), "Grandfathered · active"],
    ["Lotus", paid("grandfathered", "Grandfathered", "active"), "Grandfathered · active"],
    ["Dia Lux", paid("grandfathered", "Grandfathered", "active"), "Grandfathered · active"],
    ["Crash out", paid("starter", "Starter", "active"), "Starter · active"],
    ["Nails", paid("pro", "Pro", "active"), "Pro · active"],
  ];
  for (const [name, sub, text] of paidRows) {
    const p = planLabel({ subscription: { ...sub, currentPeriodEnd: "2020-01-01T00:00:00.000Z" }, hasConnectAccount: false, stripeOnboardingComplete: false }, NOW);
    assert(p.kind === "paid" && p.text === text && !p.needsStripeConnect && !p.activeFree, `${name}: "${text}" as-is, never "ended", no Connect chip (even with a stale period end)`, p);
  }
  assert(planLabel({ subscription: null }, NOW).text === null && planLabel({}, NOW).kind === "none", "no subscription → nothing");
  assert(planLabel({ subscription: { ...free({}), hasStripeSubscription: true } }, NOW).kind === "paid", "a zero-priced row that has a Stripe subscription is treated as paid");

  console.log("\nTest 3: \"Needs Stripe Connect\" chip");
  const chip = (sub: AdminSubscriptionSummary, account: boolean, onboarded: boolean) => planLabel({ subscription: sub, hasConnectAccount: account, stripeOnboardingComplete: onboarded }, NOW).needsStripeConnect;
  assert(chip(free({}), false, true) === true, "active free plan, no Connect account → chip (Lana)");
  assert(chip(free({}), true, false) === true, "active free plan, account but onboarding incomplete → chip");
  assert(chip(free({}), true, true) === false, "active free plan, account + onboarded → no chip");
  assert(chip(free({ currentPeriodEnd: "2026-12-31T04:59:59.000Z" }), false, false) === true, "dated active free plan → chip");
  assert(chip(free({ status: "canceled", currentPeriodEnd: "2026-09-29T14:00:00.000Z" }), false, false) === false, "ended free plan → no chip");
  assert(chip(free({ status: "active", currentPeriodEnd: "2026-09-01T03:59:59.000Z" }), false, false) === false, "ended-by-date free plan → no chip");
  assert(chip(paid("pro", "Pro", "active"), false, false) === false, "paid → no chip");

  // ── expiresAt builder ────────────────────────────────────────────────────
  console.log("\nTest 4: end-of-day New York timestamp with a DST-correct offset");
  assert(etEndOfDayIso("2026-07-04") === "2026-07-04T23:59:59-04:00", "summer → -04:00");
  assert(etEndOfDayIso("2026-12-05") === "2026-12-05T23:59:59-05:00", "winter → -05:00");
  assert(etEndOfDayIso("2026-03-08") === "2026-03-08T23:59:59-04:00", "DST starts that day (2am) → the evening is already -04:00");
  assert(etEndOfDayIso("2026-03-07") === "2026-03-07T23:59:59-05:00", "the day before DST starts → -05:00");
  assert(etEndOfDayIso("2026-11-01") === "2026-11-01T23:59:59-05:00", "DST ends that day → the evening is -05:00");
  assert(etEndOfDayIso("2026-10-31") === "2026-10-31T23:59:59-04:00", "the day before DST ends → -04:00");
  assert(new Date(etEndOfDayIso("2026-07-04")).toISOString() === "2026-07-05T03:59:59.000Z" && new Date(etEndOfDayIso("2026-12-05")).toISOString() === "2026-12-06T04:59:59.000Z", "the instants are 23:59:59 New York (03:59:59Z / 04:59:59Z next day)");
  let threw = false;
  try { etEndOfDayIso("2026-7-4"); } catch { threw = true; }
  assert(threw, "a malformed date throws instead of producing garbage");
  assert(/^\d{4}-\d{2}-\d{2}T23:59:59[+-]\d{2}:\d{2}$/.test(etEndOfDayIso("2027-01-15")), "shape is YYYY-MM-DDT23:59:59±HH:MM (valid for the backend's datetime({offset:true}))");

  console.log("\nTest 5: date picker rule (strictly after today in New York)");
  const lateNightUtc = new Date("2026-10-01T02:00:00Z"); // Sep 30, 10pm in New York
  assert(etToday(lateNightUtc) === "2026-09-30" && etToday(NOW) === "2026-09-30", "\"today\" is New York's date, not UTC's");
  assert(!isAfterEtToday("2026-09-30", lateNightUtc) && isAfterEtToday("2026-10-01", lateNightUtc), "today is blocked; tomorrow is allowed");
  assert(!isAfterEtToday("2026-09-29", NOW) && !isAfterEtToday("", NOW) && !isAfterEtToday("nope", NOW), "earlier dates, empty and malformed input are blocked");

  console.log("\nTest 6: permanent detection");
  assert(isPermanentEnd("2099-01-01T00:00:00.000Z") && isPermanentEnd("2100-06-01T00:00:00Z"), "2099-01-01 and later are permanent");
  assert(!isPermanentEnd("2098-12-31T23:59:59Z") && !isPermanentEnd(null) && !isPermanentEnd("garbage"), "just before 2099, null and garbage are not");
  assert(describeFreePlanEnd({ status: "active", currentPeriodEnd: "2026-12-31T04:59:59.000Z" }, NOW).label === "Free until December 30, 2026", "describeFreePlanEnd (claim + manage pages) uses the same labels");
  assert(describeFreePlanEnd({ status: "active", currentPeriodEnd: null }, NOW).label === "Free plan", "an active row with no end date says just \"Free plan\"");

  console.log("\nTest 7: claim-link status");
  const base = { linkExpiresAt: "2026-10-07T12:00:00.000Z", redeemedAt: null, revokedAt: null };
  assert(claimLinkStatus(base, NOW).label === "Pending", "unused, unexpired → Pending");
  assert(claimLinkStatus({ ...base, redeemedAt: "2026-09-29T15:00:00.000Z" }, NOW).label === "Claimed September 29, 2026", "redeemed → Claimed {date}");
  assert(claimLinkStatus({ ...base, revokedAt: "2026-09-29T15:00:00.000Z" }, NOW).label === "Revoked", "revoked → Revoked");
  assert(claimLinkStatus({ ...base, linkExpiresAt: "2026-09-29T00:00:00.000Z" }, NOW).label === "Expired", "past link_expires_at → Expired");
  assert(claimLinkStatus({ ...base, redeemedAt: "2026-09-29T15:00:00.000Z", revokedAt: "2026-09-29T16:00:00.000Z", linkExpiresAt: "2026-09-01T00:00:00.000Z" }, NOW).status === "claimed", "claimed wins over revoked/expired");

  console.log("\nTest 8: 409 sync hint");
  assert(errorHint("This business has a paid subscription that is still live. Complimentary grant refused.") === SYNC_HINT && SYNC_HINT === "If their paid plan was already canceled in Stripe, sync the subscription first.", "hint for \"paid subscription that is still live\"");
  assert(errorHint("This business has a Stripe subscription that is still active. Cancel it in Stripe before granting a complimentary plan.") === null, "no hint for the other 409s");
  assert(errorHint("Could not verify this business's previous Stripe subscription with Stripe. Nothing was changed.") === null && errorHint("Business not found") === null, "no hint for Stripe-check failures or other errors");

  // ── manage page predicate ────────────────────────────────────────────────
  console.log("\nTest 9: manage-page free-plan predicate");
  assert(isComplimentarySubscription({ priceInCents: 0, stripeSubscriptionId: null }), "Lana (0, no Stripe id, 2099) → free");
  assert(isComplimentarySubscription({ priceInCents: 0 }), "0 with the field absent → free");
  for (const [name, price] of [["BWL", 4099], ["Lotus", 4099], ["Dia Lux", 4099], ["Crash out", 2900], ["Nails", 9900]] as const) {
    assert(!isComplimentarySubscription({ priceInCents: price, stripeSubscriptionId: "sub_123" }), `${name} (${price}, Stripe id) → paid, unchanged`);
  }
  assert(!isComplimentarySubscription({ priceInCents: 0, stripeSubscriptionId: "sub_1" }), "a 0-priced row WITH a Stripe subscription is not free");
  assert(!isComplimentarySubscription({ priceInCents: null, stripeSubscriptionId: null }) && !isComplimentarySubscription({}), "missing price → not free");
  assert(describeFreePlanEnd({ status: "active", currentPeriodEnd: "2099-01-01T00:00:00.000Z" }, NOW).label === "Free — permanent", "Lana's manage label: Free — permanent");
  assert(describeFreePlanEnd({ status: "canceled", currentPeriodEnd: "2026-09-29T14:00:00.000Z" }, NOW).kind === "ended", "an ended winner: ended (the card is hidden)");

  // ── readJsonSafe ─────────────────────────────────────────────────────────
  console.log("\nTest 10: readJsonSafe");
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  let r = await readJsonSafe(json({ subscription: { id: "1" }, connectReady: true }));
  assert(r.status === 200 && (r.data.subscription as { id: string }).id === "1" && r.data.connectReady === true, "JSON passes through untouched");
  r = await readJsonSafe(new Response("<html><body>502 Bad Gateway</body></html>", { status: 502 }));
  assert(r.status === 502 && r.data.error === UNEXPECTED_RESPONSE_MESSAGE && UNEXPECTED_RESPONSE_MESSAGE === "Unexpected response from server", "HTML 502 → { error: \"Unexpected response from server\" }, status kept");
  r = await readJsonSafe(new Response("", { status: 200 }));
  assert(r.status === 502 && r.data.error === UNEXPECTED_RESPONSE_MESSAGE, "empty body on a 200 → unexpected response (502)");
  r = await readJsonSafe(new Response("", { status: 404 }));
  assert(r.status === 404 && r.data.error === UNEXPECTED_RESPONSE_MESSAGE, "empty body on a 404 keeps 404");
  r = await readJsonSafe(json({ error: { code: "TOKEN_EXPIRED", message: "Access token has expired" } }, 401));
  assert(r.status === 401 && r.data.error === "Access token has expired" && r.data.code === "TOKEN_EXPIRED", "object error → string message, code kept (authMiddleware 401)");
  r = await readJsonSafe(json({ success: false, message: "Too many attempts, please try again later" }, 429));
  assert(r.status === 429 && r.data.error === "Too many attempts, please try again later", "no `error` but a `message` on a failure → error = message");
  r = await readJsonSafe(json({ error: "Too many attempts", message: "x", code: "RATE_LIMITED" }, 429));
  assert(r.data.error === "Too many attempts" && r.data.code === "RATE_LIMITED", "a string error and its code are untouched");
  r = await readJsonSafe(json({ message: "just a message" }, 200));
  assert(r.data.error === undefined && r.data.message === "just a message", "a success body with `message` does not get an invented `error`");
  r = await readJsonSafe(json([1, 2, 3]));
  assert(r.status === 502 && r.data.error === UNEXPECTED_RESPONSE_MESSAGE, "a JSON array is not an object response");
  r = await readJsonSafe(json({ error: { nested: true } }, 500));
  assert(typeof r.data.error === "string", "an object error with no message still becomes a string");

  // ── safeReturn ───────────────────────────────────────────────────────────
  console.log("\nTest 11: login ?return= validation");
  const ORIGIN = "https://www.goutsyde.com";
  for (const ok of ["/subscription", "/subscribe/free/abc-_XYZ", "/subscribe/grant/eyJhIjoxfQ.sig", "/subscription/manage?tier=abc&grant=x%2By", "/"]) {
    assert(safeReturn(ok, ORIGIN) === ok, `passes: ${JSON.stringify(ok)}`);
  }
  for (const bad of ["//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/ /evil.com", "/\u0000/evil.com", "https://evil.com", "http://www.goutsyde.com/x", "javascript:alert(1)", "evil.com", "\\\\evil.com", "/%5Cevil.com\\", ""]) {
    assert(safeReturn(bad, ORIGIN) === "/", `→ "/": ${JSON.stringify(bad)}`);
  }
  assert(safeReturn(null, ORIGIN) === "/" && safeReturn(undefined, ORIGIN) === "/", "missing → \"/\"");
  assert(safeReturn("/%2Fevil.com", ORIGIN) === "/%2Fevil.com", "an encoded slash stays a same-origin path (it is not a protocol-relative URL)");

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
