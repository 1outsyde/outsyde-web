/** Unit tests for the Discover BFF query allowlist. No server needed: npx tsx tests/discover-keys.test.ts */
import { pickKeys, FEED_RULES, PULSE_RULES } from "../app/api/discover/_lib/keys";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}
const feed = (qs: string) => pickKeys(new URLSearchParams(qs), FEED_RULES).toString();
const pulse = (qs: string) => pickKeys(new URLSearchParams(qs), PULSE_RULES).toString();

console.log("FEED_RULES");
eq(feed("limit=50&lat=40&lng=-73&city=X&scope=following&offset=30"), "limit=50&scope=following&offset=30", "keeps limit, scope, offset; drops lat, lng, city");
eq(feed("lat=1&lng=2"), "", "location only gives an empty query");
eq(feed("scope=pro"), "", "scope other than following is dropped");
eq(feed("limit=0"), "", "limit 0 dropped");
eq(feed("limit=51"), "", "limit 51 dropped");
eq(feed("limit=abc"), "", "limit abc dropped");
eq(feed("limit=1.5"), "", "fractional limit dropped");
eq(feed("limit=1"), "limit=1", "limit 1 kept");
eq(feed("offset=-1"), "", "negative offset dropped");
eq(feed("offset=0"), "offset=0", "offset 0 kept");
eq(feed("offset=1e3"), "", "exponent offset dropped");

console.log("PULSE_RULES");
eq(pulse("limit=21"), "", "limit 21 dropped");
eq(pulse("limit=20&cursor=MjA="), "limit=20&cursor=MjA%3D", "limit 20 and cursor kept");
eq(pulse("cursor=<script>"), "", "script cursor dropped");
eq(pulse("cursor=" + "A".repeat(25)), "", "cursor over 24 chars dropped");
eq(pulse("lat=1&lng=2&excludeIds=a,b&offset=4"), "", "other keys dropped");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
