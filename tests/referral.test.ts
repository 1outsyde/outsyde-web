/**
 * Friend referral invite (Step 3, 2026-10-23).
 * Run with: npx tsx tests/referral.test.ts
 * Rules: 2,500 points each ($5) when the friend's first purchase of $10 or more is final.
 * Copy rules: real punctuation, no dashes, never a percentage, points are Outsyde loyalty rewards.
 */
import { existsSync, readFileSync } from "node:fs";
import { normalizeReferralCode, signupHrefForCode, REFERRAL_COPY } from "../lib/referral";

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

console.log("\n2. Copy");
for (const [k, v] of Object.entries(REFERRAL_COPY)) {
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
}
const signup = readFileSync("app/consumer-signup/page.tsx", "utf8");
assert(/referralCode/.test(signup) && /normalizeReferralCode/.test(signup), "signup reads and validates the code");
assert(/\.\.\.\(referralCode \? \{ referralCode \} : \{\}\)/.test(signup), "signup sends referralCode only when there is one");
const points = readFileSync("app/account/points/page.tsx", "utf8");
assert(points.includes("/api/account/referral"), "points page loads the invite card");
const bff = "app/api/account/referral/route.ts";
assert(existsSync(bff) && readFileSync(bff, "utf8").includes('proxyToBackend("/api/referral/code"'), "invite BFF proxies /api/referral/code");
assert(readFileSync("lib/plan-offer.ts", "utf8").includes('"/r"'), "plan offer popup skips /r");

console.log("\n4. App link ordering");
const aasa = readFileSync("public/.well-known/apple-app-site-association", "utf8");
assert(!aasa.includes("/r"), "iPhone app links do not claim /r/ yet (the app can't open them until its update ships)");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
