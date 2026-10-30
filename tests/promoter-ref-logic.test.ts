/**
 * Unit tests for promoter link memory on goutsyde.com/e/<slug> (Event team step 3).
 * No server needed: npx tsx tests/promoter-ref-logic.test.ts
 *
 * Rules (Legend 2026-10-30): the page remembers the promoter code from `?ref=` for that event, in this browser, for
 * 7 days. The last link opened wins. A bad code is never saved and never sent. Storage that is missing or throws
 * (private mode, blocked site data) never breaks the page: nothing is remembered.
 */
import { normalizeRef, refFromSearch, rememberRefFromUrl, readRef, refStorageKey, REF_TTL_MS, withLinkCode } from "../app/e/[slug]/promoterRef";

let passed = 0, failed = 0;
function eq(actual: unknown, expected: unknown, name: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, JSON.stringify(actual), "expected", JSON.stringify(expected)); }
}

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
    raw: m,
  };
}
const throwing = {
  getItem: () => { throw new Error("SecurityError"); },
  setItem: () => { throw new Error("QuotaExceededError"); },
  removeItem: () => { throw new Error("SecurityError"); },
};

const EV = "11111111-2222-3333-4444-555555555555";
const EV2 = "99999999-2222-3333-4444-555555555555";
const T0 = Date.UTC(2026, 9, 30, 15, 0, 0);
const DAY = 86400000;

console.log("normalizeRef");
eq(normalizeRef("ABCD2345"), "ABCD2345", "a valid code");
eq(normalizeRef("  abcd2345 "), "ABCD2345", "trimmed and upper cased");
eq(normalizeRef("ABCD234"), null, "7 characters: no");
eq(normalizeRef("ABCD23456"), null, "9 characters: no");
eq(normalizeRef("ABCD234O"), null, "letter O is never in a code");
eq(normalizeRef("ABCD2341"), null, "digit 1 is never in a code");
eq(normalizeRef(""), null, "empty: no");
eq(normalizeRef(null), null, "null: no");
eq(normalizeRef(12345678), null, "a number: no");
eq(normalizeRef("<script>"), null, "markup: no");

console.log("refFromSearch");
eq(refFromSearch("?ref=ABCD2345"), "ABCD2345", "plain ?ref=");
eq(refFromSearch("?checkout=x&qty=2&ref=abcd2345"), "ABCD2345", "among other params, lower case");
eq(refFromSearch("ref=ABCD2345"), "ABCD2345", "without the leading ?");
eq(refFromSearch("?ref=%20ABCD2345%20"), "ABCD2345", "encoded spaces trimmed");
eq(refFromSearch("?ref=nope"), null, "bad code");
eq(refFromSearch("?refx=ABCD2345"), null, "other param name");
eq(refFromSearch(""), null, "no query");
eq(refFromSearch("?ref=ABCD2345&ref=WXYZ6789"), "ABCD2345", "first ref param when repeated");

console.log("remember and read");
const s = memStorage();
eq(rememberRefFromUrl(s, EV, "?ref=ABCD2345", T0), "ABCD2345", "remembers a valid code from the address");
eq(readRef(s, EV, T0 + 1000), "ABCD2345", "read back for the same event");
eq(readRef(s, EV2, T0 + 1000), null, "not for another event");
eq(readRef(s, EV, T0 + 7 * DAY - 1), "ABCD2345", "still there just under 7 days");
eq(readRef(s, EV, T0 + 7 * DAY), null, "gone at 7 days");
eq(s.raw.has(refStorageKey(EV)), false, "an expired entry is removed when read");
eq(REF_TTL_MS, 7 * DAY, "7 days");

console.log("last link opened wins");
const s2 = memStorage();
rememberRefFromUrl(s2, EV, "?ref=ABCD2345", T0);
eq(rememberRefFromUrl(s2, EV, "?ref=WXYZ6789", T0 + DAY), "WXYZ6789", "a second link replaces the first");
eq(readRef(s2, EV, T0 + DAY + 1), "WXYZ6789", "reads the last one");
eq(readRef(s2, EV, T0 + 7 * DAY + 1), "WXYZ6789", "the 7 days restart from the last link");
eq(rememberRefFromUrl(s2, EV, "", T0 + 2 * DAY), null, "a visit without a code changes nothing");
eq(readRef(s2, EV, T0 + 2 * DAY), "WXYZ6789", "still the last link");
eq(rememberRefFromUrl(s2, EV, "?ref=bad", T0 + 2 * DAY), null, "a bad code isn't saved");
eq(readRef(s2, EV, T0 + 2 * DAY), "WXYZ6789", "and doesn't clear the good one");

console.log("bad saved values");
const s3 = memStorage();
s3.raw.set(refStorageKey(EV), "not json");
eq(readRef(s3, EV, T0), null, "garbage: nothing");
s3.raw.set(refStorageKey(EV), JSON.stringify({ code: "nope", savedAt: T0 }));
eq(readRef(s3, EV, T0), null, "a saved bad code: nothing");
s3.raw.set(refStorageKey(EV), JSON.stringify({ code: "ABCD2345", savedAt: T0 + DAY }));
eq(readRef(s3, EV, T0), null, "saved in the future (clock moved back): nothing");
s3.raw.set(refStorageKey(EV), JSON.stringify({ code: "ABCD2345" }));
eq(readRef(s3, EV, T0), null, "no time: nothing");

console.log("storage missing or throwing never breaks the page");
eq(rememberRefFromUrl(null, EV, "?ref=ABCD2345", T0), "ABCD2345", "no storage: code still read from the address");
eq(readRef(null, EV, T0), null, "no storage: nothing to read");
eq(rememberRefFromUrl(throwing, EV, "?ref=ABCD2345", T0), "ABCD2345", "throwing storage: no throw");
eq(readRef(throwing, EV, T0), null, "throwing storage read: null, no throw");
eq(rememberRefFromUrl(memStorage(), "", "?ref=ABCD2345", T0), null, "no event id: nothing saved");

console.log("request bodies");
const rsvpBody = { ticketTypeId: "t1", quantity: 2, idempotencyKey: "k-12345678" };
eq(JSON.stringify(withLinkCode(rsvpBody, null)), JSON.stringify(rsvpBody), "no code: the body is exactly what it was before");
eq(Object.keys(withLinkCode(rsvpBody, null)).includes("linkCode"), false, "no code: no linkCode key at all");
eq(withLinkCode(rsvpBody, "ABCD2345"), { ticketTypeId: "t1", quantity: 2, idempotencyKey: "k-12345678", linkCode: "ABCD2345" }, "with a code: linkCode added last");
eq(rsvpBody, { ticketTypeId: "t1", quantity: 2, idempotencyKey: "k-12345678" }, "the original body is not changed");
const s4 = memStorage();
rememberRefFromUrl(s4, EV, "?ref=ABCD2345", T0);
eq(withLinkCode({ ticketTypeId: "t1", quantity: 1, idempotencyKey: "k-1" }, readRef(s4, EV, T0 + DAY)),
  { ticketTypeId: "t1", quantity: 1, idempotencyKey: "k-1", linkCode: "ABCD2345" }, "remembered code goes into the checkout body a day later");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
