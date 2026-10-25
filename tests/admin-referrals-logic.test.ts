/** Unit tests for the admin referrals helpers. No server needed: npx tsx tests/admin-referrals-logic.test.ts */
import { existsSync, readFileSync } from "node:fs";
import {
  usd, actionsFor, payoutPill, referralPill, friendPill, attentionCopy, BIZ_FILTERS, filterBusiness, filterFriends,
  ACTION_COPY, isAdminAction, allCopy, type AdminBusinessReferral, type AdminFriendReferral,
} from "../app/admin/referrals/_lib/referrals";

let passed = 0, failed = 0;
function assert(cond: boolean, name: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.error(`  ❌ ${name}`, detail === undefined ? "" : JSON.stringify(detail)); }
}
const pay = (o: Partial<NonNullable<AdminBusinessReferral["payout"]>> = {}) => ({
  id: "p1", status: "pending", paused: false, holdReason: null, amountCents: 2500, payableAfter: "2026-10-31T16:00:00Z",
  attempts: 0, lastError: null, nextAttemptAt: null, paidAt: null, destinationType: null, account: null, transfer: null, sending: false, ...o,
});
const biz = (o: Partial<AdminBusinessReferral> = {}): AdminBusinessReferral => ({
  id: "r1", businessName: "Kay's Braids", referrer: { id: "u1", username: "legend" }, owner: { username: "kay" }, status: "qualified",
  blockReason: null, createdAt: "2026-10-01T16:00:00Z", qualifiedAt: "2026-10-24T16:00:00Z", expiresAt: "2026-12-30T16:00:00Z", payout: pay(), ...o,
});

console.log("\n1. Money");
assert(usd(2500) === "$25" && usd(0) === "$0" && usd(250000) === "$2,500" && usd(2550) === "$25.50", "usd formats whole and partial dollars");

console.log("\n2. Which buttons show");
const kinds = (b: AdminBusinessReferral) => actionsFor(b).map((a) => a.kind).join(",");
assert(kinds(biz()) === "pause,cancel", "waiting to send: Pause, Cancel");
assert(kinds(biz({ payout: pay({ status: "held", holdReason: "no_account" }) })) === "pause,cancel", "held for setup: Pause, Cancel");
assert(kinds(biz({ payout: pay({ status: "held", holdReason: "admin_paused", paused: true }) })) === "release,cancel", "paused: Release, Cancel");
assert(kinds(biz({ payout: pay({ status: "review" }) })) === "retry,cancel", "review: Retry, Cancel");
assert(kinds(biz({ payout: pay({ sending: true }) })) === "", "may be sending: no buttons");
assert(kinds(biz({ payout: pay({ status: "paid" }) })) === "" && kinds(biz({ payout: pay({ status: "cancelled" }) })) === "", "paid or cancelled: no buttons");
assert(kinds(biz({ status: "pending", payout: null })) === "", "no payout yet: no buttons");
assert(actionsFor(biz()).find((a) => a.kind === "cancel")?.tone === "danger", "Cancel is the danger style");

console.log("\n3. Labels");
assert(payoutPill(biz().payout!, new Date("2026-10-24T16:00:00Z")).text.includes("Oct 31"), "pending payout pill names the send date");
assert(payoutPill(pay({ status: "held", holdReason: "admin_paused", paused: true })).text === "Paused", "paused pill");
assert(/payout setup/i.test(payoutPill(pay({ status: "held", holdReason: "no_account" })).text), "held for setup pill");
assert(/Stripe/.test(payoutPill(pay({ status: "held", holdReason: "stripe_not_ready" })).text), "held at Stripe pill");
assert(payoutPill(pay({ status: "review" })).tone === "red" && payoutPill(pay({ status: "paid" })).tone === "green", "review is red, paid is green");
assert(/Sending/.test(payoutPill(pay({ sending: true })).text), "sending pill");
assert(referralPill(biz({ status: "blocked", blockReason: "yearly_cap" })).text.includes("20"), "yearly cap block names the 20 a year rule");
assert(/own/i.test(referralPill(biz({ status: "blocked", blockReason: "owner" })).text), "owner block in plain words");
assert(referralPill(biz({ status: "pending", payout: null })).text === "Not live yet", "pending referral");
assert(friendPill({ status: "completed" } as AdminFriendReferral).tone === "green" && friendPill({ status: "pending" } as AdminFriendReferral).text === "No purchase yet", "friend pills");
for (const k of ["review", "paused", "waiting_setup", "waiting_balance"] as const) assert(attentionCopy(k).title.length > 0 && attentionCopy(k).why.length > 0, `attention copy for ${k}`);

console.log("\n4. Filters and search");
const list = [
  biz({ id: "a", status: "pending", payout: null }),
  biz({ id: "b" }),
  biz({ id: "c", payout: pay({ status: "paid" }) }),
  biz({ id: "d", payout: pay({ status: "review" }) }),
  biz({ id: "e", payout: pay({ status: "held", holdReason: "admin_paused", paused: true }) }),
  biz({ id: "f", status: "blocked", payout: null, businessName: "Nail Spot", referrer: { id: "u2", username: "pam" } }),
];
const ids = (f: string, s = "") => filterBusiness(list, f, s).map((b) => b.id).join("");
assert(BIZ_FILTERS.map((f) => f.key).join(",") === "all,waiting,upcoming,paid,problems", "filter chips");
assert(ids("all") === "abcdef" && ids("waiting") === "a" && ids("upcoming") === "b" && ids("paid") === "c" && ids("problems") === "def", "each filter picks the right rows", { all: ids("all"), w: ids("waiting"), u: ids("upcoming"), p: ids("paid"), x: ids("problems") });
assert(ids("all", "nail") === "f" && ids("all", "@PAM") === "f" && ids("all", "kay") === "abcdef" && ids("all", "braids") === "abcde", "search by business, referrer or owner, any case, @ allowed");
const friends: AdminFriendReferral[] = [
  { id: "1", referrer: { id: "u1", username: "legend" }, friend: { username: "mia" }, status: "completed", referrerPoints: 2500, friendPoints: 2500, firstPurchaseType: "appointment", createdAt: null, paidAt: null },
  { id: "2", referrer: { id: "u2", username: "pam" }, friend: { username: "joe" }, status: "pending", referrerPoints: 2500, friendPoints: 2500, firstPurchaseType: null, createdAt: null, paidAt: null },
];
assert(filterFriends(friends, "MIA").map((f) => f.id).join("") === "1" && filterFriends(friends, "").length === 2, "friend search");

console.log("\n5. Actions and copy rules");
assert(isAdminAction("pause") && isAdminAction("release") && isAdminAction("cancel") && isAdminAction("retry") && !isAdminAction("delete") && !isAdminAction(""), "only the four actions are allowed");
assert(/can't be undone/i.test(ACTION_COPY.cancel.confirm) && /no money/i.test(ACTION_COPY.cancel.confirm), "cancel confirm says no money goes out and it can't be undone");
for (const t of allCopy()) assert(!/(—|–| - )/.test(t) && !/%/.test(t), `copy has no dashes or percentages: ${t.slice(0, 40)}`);

console.log("\n6. Pages and BFFs");
const page = "app/admin/referrals/page.tsx";
assert(existsSync(page) && /robots|title/.test(readFileSync(page, "utf8")), "admin page exists with a title");
const list1 = "app/api/admin/referrals/route.ts";
assert(existsSync(list1) && readFileSync(list1, "utf8").includes('"/api/admin/referrals"'), "list BFF forwards to /api/admin/referrals");
const act = "app/api/admin/referrals/payouts/[payoutId]/[action]/route.ts";
assert(existsSync(act) && /isAdminAction/.test(readFileSync(act, "utf8")) && /forwardAdmin/.test(readFileSync(act, "utf8")), "action BFF checks the action name and uses forwardAdmin");
assert(readFileSync("app/admin/AdminNav.tsx", "utf8").includes('href: "/admin/referrals"'), "admin nav has Referrals");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
