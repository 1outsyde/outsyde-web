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

// Sitemap lists every legal page and keeps the existing routes.
import sitemap from "../app/sitemap";
const urls = sitemap().map((e) => e.url);
for (const h of hrefs) assert(urls.includes(`https://www.goutsyde.com${h}`), `sitemap lists ${h}`, urls);
assert(urls.includes("https://www.goutsyde.com/coming-soon") && urls.includes("https://www.goutsyde.com/shop"), "sitemap keeps existing routes");
assert(new Set(urls).size === urls.length, "sitemap has no duplicate URLs");

// next.config redirects: every old URL, permanent (308).
import nextConfig from "../next.config";
(async () => {
  const redirects = nextConfig.redirects ? await nextConfig.redirects() : [];
  for (const r of LEGAL_REDIRECTS) {
    const hit = redirects.find((x) => x.source === r.source);
    assert(!!hit && hit.destination === r.destination && (hit as { permanent?: boolean }).permanent === true, `308 ${r.source} → ${r.destination}`, hit);
  }
  const headers = nextConfig.headers ? await nextConfig.headers() : [];
  assert(headers.length === 3, "existing headers() untouched", headers.length);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})();
