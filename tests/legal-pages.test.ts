/**
 * Legal pages list, old-URL redirects and sitemap entries.
 * Run with: npx tsx tests/legal-pages.test.ts
 */
import { LEGAL_PAGES, LEGAL_REDIRECTS } from "../lib/legal-pages";

let passed = 0, failed = 0;
function assert(c: boolean, name: string, d?: unknown) {
  if (c) { passed++; console.log(`  ✅ ${name}`); } else { failed++; console.error(`  ❌ ${name}`, d === undefined ? "" : JSON.stringify(d)); }
}

const hrefs = LEGAL_PAGES.map((p) => p.href);
assert(JSON.stringify(hrefs) === JSON.stringify(["/terms", "/privacy", "/refund-policy", "/shipping-policy"]), "four legal pages in footer order", hrefs);
assert(
  JSON.stringify(LEGAL_PAGES.map((p) => p.label)) === JSON.stringify(["Terms of Service", "Privacy Policy", "Refund Policy", "Shipping Policy"]),
  "legal page labels",
  LEGAL_PAGES.map((p) => p.label),
);

const sources = LEGAL_REDIRECTS.map((r) => r.source).sort();
assert(
  JSON.stringify(sources) === JSON.stringify(["/english-privacy-policy", "/english-refund-policy", "/english-shipping-policy", "/terms-and-conditions"]),
  "old Wix legal URLs are the redirect sources",
  sources,
);
assert(LEGAL_REDIRECTS.every((r) => (hrefs as string[]).includes(r.destination)), "every redirect lands on a legal page", LEGAL_REDIRECTS);
assert(LEGAL_REDIRECTS.every((r) => !(hrefs as string[]).includes(r.source)), "no redirect starts at a live legal page (no loops)");
const byOld = Object.fromEntries(LEGAL_REDIRECTS.map((r) => [r.source, r.destination]));
assert(byOld["/terms-and-conditions"] === "/terms" && byOld["/english-privacy-policy"] === "/privacy", "terms and privacy map correctly", byOld);
assert(byOld["/english-refund-policy"] === "/refund-policy" && byOld["/english-shipping-policy"] === "/shipping-policy", "refund and shipping map correctly", byOld);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
