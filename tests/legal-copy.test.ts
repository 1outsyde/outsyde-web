/**
 * Refund + Shipping policy copy rules.
 * Run with: npx tsx tests/legal-copy.test.ts
 * Copy rules: no dashes, never a fee percentage; key policy terms present.
 */
import { existsSync, readFileSync } from "node:fs";

let passed = 0, failed = 0;
function assert(c: boolean, name: string, d?: unknown) {
  if (c) { passed++; console.log(`  ✅ ${name}`); } else { failed++; console.error(`  ❌ ${name}`, d === undefined ? "" : JSON.stringify(d)); }
}

// Visible copy only: drop comments, imports, attribute values and the CSS-free JSX tags.
function visibleText(src: string): string {
  return src
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ");
}

for (const [name, file] of [["refund", "app/refund-policy/page.tsx"], ["shipping", "app/shipping-policy/page.tsx"]] as const) {
  assert(existsSync(file), `${name}: page exists`);
  if (!existsSync(file)) continue;
  const src = readFileSync(file, "utf8");
  const text = visibleText(src);
  const dash = text.match(/.{0,30}(—|–| - ).{0,30}/);
  assert(!dash, `${name}: no dashes in copy`, dash?.[0]);
  const pct = text.match(/.{0,30}%.{0,30}/);
  assert(!pct, `${name}: no percentage in copy`, pct?.[0]);
  assert(new RegExp(`canonical: ["']https://www\\.goutsyde\\.com/${name}-policy["']`).test(src), `${name}: own canonical on www`);
}

if (existsSync("app/refund-policy/page.tsx")) {
  const t = visibleText(readFileSync("app/refund-policy/page.tsx", "utf8"));
  assert(t.includes("within 14 days of delivery"), "refund: 14 day reporting window");
  assert(t.includes("less the service fee"), "refund: vendor cancel refund is less the service fee");
  assert(t.includes("non refundable in all cases"), "refund: service fee never refundable");
  assert(t.includes("deposit is non refundable once your booking is confirmed"), "refund: deposits non refundable");
}
if (existsSync("app/shipping-policy/page.tsx")) {
  const t = visibleText(readFileSync("app/shipping-policy/page.tsx", "utf8"));
  assert(t.includes("Risk of loss passes to you when the Vendor delivers your order to the carrier"), "shipping: risk of loss clause");
  assert(t.includes("required to provide a tracking number for every shipment"), "shipping: tracking required");
}

for (const [f, path] of [["app/terms/page.tsx", "/terms"], ["app/privacy/page.tsx", "/privacy"]]) {
  const src = readFileSync(f, "utf8");
  assert(src.includes(`canonical: 'https://www.goutsyde.com${path}'`), `${path}: own canonical on www`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
