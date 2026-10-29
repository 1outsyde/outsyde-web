/** Unit tests for the event link share image rules (photo ratios 3c). Run: npx tsx tests/share-image.test.ts */
import { MAX_COVER_BYTES, SHARE_MARGIN, SHARE_SIZE, coverUsable, shareTitle } from "../app/e/[slug]/shareImage";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}

console.log("size");
eq(SHARE_SIZE, { width: 1200, height: 630 }, "link preview size");
eq((SHARE_SIZE.height - SHARE_MARGIN * 2) > 500, true, "flyer stays large");

console.log("coverUsable");
const u = "https://cdn.example.com/covers/a.jpg";
eq(coverUsable(u, "image/jpeg", 1000), true, "jpeg ok");
eq(coverUsable(u, "image/png; charset=binary", 1000), true, "png with params ok");
eq(coverUsable(u, "IMAGE/JPEG", 1000), true, "case does not matter");
eq(coverUsable(u, "image/webp", 1000), false, "webp: plain card");
eq(coverUsable(u, "image/heic", 1000), false, "heic: plain card");
eq(coverUsable(u, null, 1000), false, "no type: plain card");
eq(coverUsable("http://cdn.example.com/a.jpg", "image/jpeg", 1000), false, "http refused");
eq(coverUsable(null, "image/jpeg", 1000), false, "no cover");
eq(coverUsable(u, "image/jpeg", 0), false, "empty body");
eq(coverUsable(u, "image/jpeg", MAX_COVER_BYTES), true, "at the limit ok");
eq(coverUsable(u, "image/jpeg", MAX_COVER_BYTES + 1), false, "over the limit");

console.log("shareTitle");
eq(shareTitle("  Halloween   Night "), "Halloween Night", "spaces tidied");
eq(shareTitle(""), "Outsyde", "empty: Outsyde");
eq(shareTitle(null), "Outsyde", "missing: Outsyde");
const long = "A".repeat(80);
eq(shareTitle(long).length, 68, "long title cut with an ellipsis");
eq(shareTitle(long).endsWith("…"), true, "ellipsis");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
