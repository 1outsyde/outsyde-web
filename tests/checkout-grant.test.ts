/**
 * Checkout grant pass-through — run with: npx tsx tests/checkout-grant.test.ts
 * Pure helpers plus the checkout BFF itself (global fetch is stubbed; no network, no backend).
 */

import { NextRequest } from "next/server";
import {
  GRANT_EXPIRED_OR_WRONG_ACCOUNT,
  PLAN_NOT_AVAILABLE,
  buildCheckoutBody,
  tierNotAvailableMessage,
} from "../lib/checkout-grant";
import { POST } from "../app/api/subscription/checkout/route";

let passed = 0;
let failed = 0;
function assert(condition: boolean, name: string, detail?: unknown) {
  if (condition) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.error(`  ❌ ${name}`, detail === undefined ? "" : JSON.stringify(detail)); }
}

(async () => {
  console.log("\nTest 1: body builder");
  assert(JSON.stringify(buildCheckoutBody("t1", "abc.def")) === '{"tierId":"t1","grant":"abc.def"}', "grant present → { tierId, grant }");
  assert(JSON.stringify(buildCheckoutBody("t1", undefined)) === '{"tierId":"t1"}', "grant absent → exactly { tierId }");
  assert(JSON.stringify(buildCheckoutBody("t1", null)) === '{"tierId":"t1"}', "null → { tierId }");
  assert(JSON.stringify(buildCheckoutBody("t1", "")) === '{"tierId":"t1"}', "empty string → { tierId }");
  for (const bad of [123, true, {}, ["x"], 0]) {
    assert(JSON.stringify(buildCheckoutBody("t1", bad)) === '{"tierId":"t1"}', `non-string ${JSON.stringify(bad)} → { tierId }`);
  }

  console.log("\nTest 2: error copy");
  assert(tierNotAvailableMessage({ status: 403, code: "TIER_NOT_AVAILABLE" }, true) === "This link has expired or isn't for this account. Ask Outsyde for a new one." && GRANT_EXPIRED_OR_WRONG_ACCOUNT === tierNotAvailableMessage({ status: 403, code: "TIER_NOT_AVAILABLE" }, true), "403 TIER_NOT_AVAILABLE with a grant");
  assert(tierNotAvailableMessage({ status: 403, code: "TIER_NOT_AVAILABLE" }, false) === "This plan isn't available for your account." && PLAN_NOT_AVAILABLE === "This plan isn't available for your account.", "403 TIER_NOT_AVAILABLE without a grant");
  assert(tierNotAvailableMessage({ status: 403, code: "OTHER" }, true) === null && tierNotAvailableMessage({ status: 403 }, false) === null, "403 with another code → existing behaviour (null)");
  assert(tierNotAvailableMessage({ status: 404, code: "TIER_NOT_AVAILABLE" }, true) === null && tierNotAvailableMessage({ status: 500, code: "TIER_NOT_AVAILABLE" }, false) === null, "other statuses → existing behaviour");

  console.log("\nTest 3: checkout BFF forwards the grant and relays code");
  process.env.OUTSYDE_BACKEND_URL = "http://backend.test";
  const realFetch = globalThis.fetch;
  let sent: { url: string; body: string; auth: string | null } | null = null;
  const stub = (status: number, payload: string) => {
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      sent = { url: String(url), body: String(init?.body), auth: new Headers(init?.headers).get("authorization") };
      return new Response(payload, { status, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
  };
  const call = async (body: unknown, cookie = "outsyde_access_token=JWT123") => {
    const req = new NextRequest("http://web.test/api/subscription/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    return { status: res.status, body: await res.json() };
  };

  stub(200, JSON.stringify({ success: true, url: "https://checkout.stripe.test/s" }));
  let r = await call({ tierId: "tier-1", grant: "payload.sig" });
  assert(sent !== null && JSON.parse((sent as { body: string }).body).grant === "payload.sig" && JSON.parse((sent as { body: string }).body).tierId === "tier-1", "grant present → backend body { tierId, grant }");
  assert(r.status === 200 && JSON.stringify(r.body) === '{"url":"https://checkout.stripe.test/s"}', "success shape unchanged: { url }");
  assert((sent as unknown as { auth: string }).auth === "Bearer JWT123" && (sent as unknown as { url: string }).url === "http://backend.test/api/stripe/checkout/tier-subscription", "auth header and backend URL unchanged");
  r = await call({ tierId: "tier-1" });
  assert((sent as unknown as { body: string }).body === '{"tierId":"tier-1"}', "grant absent → backend body is exactly { tierId }");
  r = await call({ tierId: "tier-1", grant: 42 });
  assert((sent as unknown as { body: string }).body === '{"tierId":"tier-1"}', "non-string grant is not forwarded");
  r = await call({ tierId: "tier-1", grant: "" });
  assert((sent as unknown as { body: string }).body === '{"tierId":"tier-1"}', "empty grant is not forwarded");
  r = await call({ tierId: "tier-1", grant: "x", extra: "ignored" });
  assert(!("extra" in JSON.parse((sent as unknown as { body: string }).body)), "no other field is forwarded");

  stub(200, JSON.stringify({ success: true, tierChanged: true, newTier: "Growth" }));
  r = await call({ tierId: "tier-2" });
  assert(r.status === 200 && JSON.stringify(r.body) === '{"tierChanged":true,"newTier":"Growth"}', "tier-changed shape unchanged");

  stub(403, JSON.stringify({ success: false, error: { code: "TIER_NOT_AVAILABLE", message: "This plan isn't available for your account." } }));
  r = await call({ tierId: "hidden", grant: "x.y" });
  assert(r.status === 403 && r.body.code === "TIER_NOT_AVAILABLE" && r.body.error === "This plan isn't available for your account.", "403 → { error, code } with the upstream status", r);

  stub(400, JSON.stringify({ success: false, error: { code: "SAME_TIER", message: "Already on this tier" } }));
  r = await call({ tierId: "same" });
  assert(r.status === 400 && r.body.error === "Already on this tier" && r.body.code === "SAME_TIER", "other errors keep their message and status (code now included)");

  stub(502, "<html>502 Bad Gateway</html>");
  r = await call({ tierId: "t" });
  assert(r.status === 502 && r.body.error === "Could not start checkout. Please try again." && r.body.code === undefined, "HTML 502 → friendly message, no throw");
  stub(200, "");
  r = await call({ tierId: "t" });
  assert(r.status === 200 || r.status === 502, "an empty 200 does not throw");
  assert(r.body.error === "Could not start checkout. Please try again.", "…and returns the friendly message", r);

  globalThis.fetch = (async () => { throw new Error("network down"); }) as typeof fetch;
  r = await call({ tierId: "t" });
  assert(r.status === 502 && r.body.error === "Could not start checkout. Please try again.", "network failure → 502 friendly message (unchanged)");

  globalThis.fetch = realFetch;
  r = await call({ tierId: "t" }, "");
  assert(r.status === 401, "no token → 401 (unchanged)");
  r = await call({ tierId: " " });
  assert(r.status === 400 && r.body.error === "tierId is required.", "empty tierId → 400 (unchanged)");

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
