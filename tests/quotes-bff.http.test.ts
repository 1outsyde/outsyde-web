/* eslint-disable @typescript-eslint/no-explicit-any -- test fixtures */
/**
 * Quotes step 5b: the goutsyde.com quote BFF routes (/api/quotes/..., /api/me/quotes, /api/me/requests) and the
 * /q/<code> and /account/quotes pages.
 *
 * Run with: npx tsx tests/quotes-bff.http.test.ts
 * LOCAL ONLY. This site running (next start) with OUTSYDE_BACKEND_URL pointing at a localhost outsyde-backend on a
 * scratch Postgres. Environment:
 *   QW_WEB_URL       e.g. http://localhost:3100        (localhost only)
 *   QW_BACKEND_URL   e.g. http://localhost:5062        (localhost only; seeds quotes)
 *   QW_PG_URL        the backend's scratch database     (localhost only; seeds users, cleans up)
 *   QW_BACKEND_DIR   an outsyde-backend checkout (pg and jsonwebtoken load from it)
 *   QW_JWT_SECRET    the backend's JWT secret
 *   QW_STRIPE_PORT   the port the backend's Stripe stub preload points at (this test serves it)
 * Skips (exit 0) when QW_WEB_URL is unset.
 */
import { createRequire } from "module";
import http from "http";

const WEB = process.env.QW_WEB_URL;
const BACKEND = process.env.QW_BACKEND_URL;
const PG_URL = process.env.QW_PG_URL;
const STUB_PORT = Number(process.env.QW_STRIPE_PORT || "0");

let passed = 0, failed = 0;
function assert(cond: boolean, name: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.error(`  FAIL ${name}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 600)); }
}
const isLocal = (u: string) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(u).hostname);
async function call(base: string, method: string, path: string, o: { token?: string; body?: unknown; raw?: string } = {}) {
  const headers: Record<string, string> = {};
  if (o.token) { if (base === BACKEND) headers.Authorization = `Bearer ${o.token}`; else headers.Cookie = `outsyde_access_token=${o.token}`; }
  let body: string | undefined;
  if (o.raw !== undefined) { body = o.raw; headers["Content-Type"] = "application/json"; }
  else if (o.body !== undefined) { body = JSON.stringify(o.body); headers["Content-Type"] = "application/json"; }
  const res = await fetch(new URL(path, base), { method, headers, body, redirect: "manual" });
  const text = await res.text();
  let json: any = null; try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, body: json, text };
}

(async () => {
  if (!WEB) { console.log("skipped: set QW_WEB_URL, QW_BACKEND_URL, QW_PG_URL, QW_BACKEND_DIR, QW_JWT_SECRET, QW_STRIPE_PORT to run"); process.exit(0); }
  if (!BACKEND || !PG_URL || !isLocal(WEB) || !isLocal(BACKEND) || !isLocal(PG_URL) || !STUB_PORT) throw new Error("refusing to run: every URL must be localhost and QW_STRIPE_PORT set");
  const req = createRequire(`${String(process.env.QW_BACKEND_DIR).replace(/\/+$/, "")}/package.json`);
  const pg = req("pg");
  const jwt = req("jsonwebtoken");
  const db = new pg.Client({ connectionString: PG_URL });
  await db.connect();
  const q = async (t: string, p: unknown[] = []) => (await db.query(t, p)).rows as any[];
  const tok = (id: string) => jwt.sign({ userId: id, isVendor: false }, String(process.env.QW_JWT_SECRET), { expiresIn: "1h" });

  // A tiny Stripe stub: enough for the backend's pay route.
  const pis: Record<string, any> = {};
  const stub = http.createServer((r, res) => {
    let raw = ""; r.on("data", (c) => (raw += c));
    r.on("end", () => {
      const send = (code: number, o: unknown) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
      const f = Object.fromEntries(new URLSearchParams(raw).entries());
      const u = new URL(r.url || "/", "http://stub");
      if (r.method === "POST" && u.pathname === "/v1/customers") return send(200, { id: `cus_qw_${Date.now()}`, object: "customer" });
      if (r.method === "GET" && /^\/v1\/customers\//.test(u.pathname)) return send(200, { id: u.pathname.split("/").pop(), object: "customer" });
      if (r.method === "POST" && u.pathname === "/v1/customer_sessions") return send(200, { client_secret: "cuss_stub" });
      if (r.method === "POST" && u.pathname === "/v1/payment_intents") {
        const key = r.headers["idempotency-key"];
        const prior = Object.values(pis).find((p: any) => p._key === key);
        if (prior) return send(200, prior);
        const id = `pi_qw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        pis[id] = { id, object: "payment_intent", amount: Number(f.amount), status: "requires_payment_method", client_secret: `${id}_secret_x`, customer: f.customer, metadata: {}, _key: key };
        return send(200, pis[id]);
      }
      const m = u.pathname.match(/^\/v1\/payment_intents\/([^/]+)$/);
      if (r.method === "GET" && m) return pis[m[1]] ? send(200, pis[m[1]]) : send(404, { error: { type: "invalid_request_error", message: "No such payment_intent" } });
      if (r.method === "GET" && u.pathname === "/v1/payment_intents") return send(200, { object: "list", data: Object.values(pis), has_more: false });
      send(404, { error: { type: "invalid_request_error", message: `stub: ${r.method} ${u.pathname}` } });
    });
  });
  await new Promise<void>((ok) => stub.listen(STUB_PORT, "127.0.0.1", () => ok()));

  const P = `qw${Date.now().toString(36)}`;
  const users: string[] = [];
  const mkUser = async (s: string, first: string) => {
    const id = `${P}-${s}`;
    await q(`INSERT INTO users (id, username, email, first_name, last_name, name, stripe_customer_id) VALUES ($1::varchar, $1::text, $2, $3, 'Tester', $3, $4)`, [id, `${id}@qw.test`, first, `cus_${id}`]);
    users.push(id);
    return { id, token: tok(id) };
  };
  const owner = await mkUser("owner", "Benny");
  const cust = await mkUser("cust", "Ana");
  const other = await mkUser("other", "Zed");
  const biz = `${P}-biz`;
  let [tier] = await q(`SELECT id FROM subscription_tiers WHERE is_active = true LIMIT 1`);
  let tierMade = false;
  if (!tier) { [tier] = await q(`INSERT INTO subscription_tiers (id, name, display_name, price_monthly, is_active) VALUES ($1, 'qw', 'QW', 1000, true) RETURNING id`, [`${P}-tier`]); tierMade = true; }
  await q(`INSERT INTO businesses (id, owner_id, name, category, approval_status, time_zone, stripe_account_id, stripe_onboarding_complete, vendor_agreement_accepted, logo_image, brand_colors)
           VALUES ($1, $2, 'Movers QW', 'home', 'approved', 'America/New_York', $3, true, true, 'https://r2.test/logo.png', '{"primary":"#123456"}'::jsonb)`, [biz, owner.id, `acct_${P}`]);
  await q(`INSERT INTO vendor_subscriptions (id, vendor_id, business_id, tier_id, status, current_period_end) VALUES ($1, $2, $3, $4, 'active', now() + interval '30 days')`, [`${P}-sub`, owner.id, biz, tier.id]);
  const conv = `${P}-conv`;
  const [p1, p2] = owner.id < cust.id ? [owner.id, cust.id] : [cust.id, owner.id];
  await q(`INSERT INTO conversations (id, participant1_id, participant2_id) VALUES ($1, $2, $3)`, [conv, p1, p2]);
  const jobDate = new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10);

  try {
    const made = await call(BACKEND, "POST", "/api/quotes", { token: owner.token, body: { conversationId: conv, title: "2 Bedroom Move", details: "Crew of 3, gate code 4417", jobDate, startTime: "09:00", durationMinutes: 180, totalCents: 65000, paymentMode: "deposit", depositCents: 10000 } });
    const quote = made.body?.quote;
    assert(made.status === 201 && !!quote?.linkCode, "seed: a quote", made.body);
    const code = quote.linkCode;

    console.log("\nquote links");
    let r = await call(WEB, "GET", `/api/quotes/link/${code}`);
    assert(r.status === 200 && r.body?.access === "preview" && !r.body.quoteId && r.body.preview?.business?.name === "Movers QW" && !JSON.stringify(r.body).includes("gate code"), "signed out: the preview, no details", r.body);
    r = await call(WEB, "GET", `/api/quotes/link/${code}`, { token: cust.token });
    assert(r.status === 200 && r.body?.access === "customer" && r.body.quoteId === quote.id, "the customer", r.body);
    r = await call(WEB, "GET", `/api/quotes/link/${code}`, { token: other.token });
    assert(r.status === 403 && r.body?.code === "OTHER_ACCOUNT", "another account", r.body);
    r = await call(WEB, "GET", `/api/quotes/link/${encodeURIComponent("../../api/me")}`);
    assert(r.status === 404, "anything that isn't a code never reaches the backend", r.status);

    console.log("\nthe quote");
    r = await call(WEB, "GET", `/api/quotes/${quote.id}`, { token: cust.token });
    assert(r.status === 200 && r.body?.quote?.business?.brandColors?.primary === "#123456" && r.body.quote.details === "Crew of 3, gate code 4417", "the customer reads it with the business look", r.body?.quote?.business);
    r = await call(WEB, "GET", `/api/quotes/${quote.id}`);
    assert(r.status === 401, "signed out: 401 relayed", r.status);
    r = await call(WEB, "GET", `/api/quotes/${quote.id}`, { token: other.token });
    assert(r.status === 404, "another account: not found", r.status);
    r = await call(WEB, "GET", `/api/quotes/not-a-uuid`, { token: cust.token });
    assert(r.status === 404 && r.body?.code === "NOT_FOUND", "a bad id never reaches the backend", r.body);

    console.log("\nnotes (the quote's own chat)");
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/notes`, { token: cust.token, body: { content: "Is 9 AM still good?" } });
    assert(r.status === 200, "the customer sends a note", r);
    r = await call(WEB, "GET", `/api/quotes/${quote.id}/notes`, { token: owner.token });
    const msgs = r.body?.messages ?? [];
    assert(r.status === 200 && msgs.some((m: any) => m.content === "Is 9 AM still good?" && m.senderId === cust.id) && msgs.some((m: any) => m.kind === "quote"), "the business sees it in the same chat, with the quote card", msgs);
    const [row] = await q(`SELECT conversation_id FROM messages WHERE content = 'Is 9 AM still good?'`);
    assert(row?.conversation_id === conv, "it is the app chat", row);
    r = await call(WEB, "GET", `/api/quotes/${quote.id}/notes`, { token: other.token });
    assert(r.status === 404, "another account can't read the chat", r.status);
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/notes`, { token: other.token, body: { content: "hi" } });
    assert(r.status === 404, "or write in it", r.status);
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/notes`, { token: cust.token, body: { content: "   " } });
    assert(r.status === 400 && r.body?.code === "EMPTY", "an empty note", r.body);
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/notes`, { token: cust.token, body: { content: "x".repeat(2001) } });
    assert(r.status === 400 && r.body?.code === "TOO_LONG", "a note over 2,000 characters", r.body);
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/notes`, { token: cust.token, raw: "[1,2]" });
    assert(r.status === 400 && r.body?.code === "INVALID_JSON", "a body that isn't an object", r.body);

    console.log("\npaying and the rest are relayed");
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/pay`, { token: cust.token, body: {} });
    assert(r.status === 400 && r.body?.code === "INVALID_VERSION", "pay needs the version", r.body);
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/pay`, { token: cust.token, body: { version: 1, promoCodeId: "x", amount: 1 } });
    assert(r.status === 200 && typeof r.body?.clientSecret === "string" && pis[r.body.paymentIntentId]?.amount === 10800, "pay: the deposit plus its fee, only the version forwarded", r.body);
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/confirm`, { token: cust.token });
    assert(r.status === 409 && r.body?.code === "NOT_COMPLETE", "confirm before Job complete: the backend's answer", r.body);
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/report`, { token: cust.token, body: { reason: "short" } });
    assert(r.status === 400 && r.body?.code === "REASON_TOO_SHORT", "report: the backend checks the reason", r.body);
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/extras/not-a-uuid/approve`, { token: cust.token });
    assert(r.status === 404, "a bad extra id never reaches the backend", r.status);
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/extras/00000000-0000-4000-8000-000000000000/approve`, { token: cust.token, body: { newCard: true } });
    assert(r.status === 404, "an unknown extra: the backend's not found", r);
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/extras/card`, { token: cust.token });
    assert(r.status === 404 || r.status === 409, "extras card with nothing to pay", r);
    r = await call(WEB, "POST", `/api/quotes/${quote.id}/balance/card`, { token: cust.token });
    assert(r.status === 404 || r.status === 409, "balance card with nothing to pay", r);

    console.log("\nmy lists");
    r = await call(WEB, "GET", "/api/me/quotes", { token: cust.token });
    assert(r.status === 200 && r.body?.quotes?.some((x: any) => x.id === quote.id && x.linkCode === code), "my quotes", r.body);
    r = await call(WEB, "GET", "/api/me/requests", { token: cust.token });
    assert(r.status === 200 && Array.isArray(r.body?.requests), "my requests", r.body);
    r = await call(WEB, "GET", "/api/me/quotes");
    assert(r.status === 401, "signed out", r.status);

    console.log("\npages");
    r = await call(WEB, "GET", `/q/${code}`);
    assert(r.status === 200 && /<title>Your quote from Movers QW \| Outsyde<\/title>/.test(r.text) && /noindex/.test(r.text), "the quote page: named for the business, never indexed", r.text.slice(0, 200));
    assert(!r.text.includes("gate code") && !r.text.includes(cust.id), "the page's HTML holds no quote details", null);
    r = await call(WEB, "GET", `/q/bad`);
    assert(r.status === 200 && /<title>Quote \| Outsyde<\/title>/.test(r.text), "a bad code still renders (the page says it isn't valid)", r.status);
    r = await call(WEB, "GET", `/account/quotes`);
    assert(r.status === 200, "Requests and quotes page", r.status);
    r = await call(WEB, "GET", `/account/orders`);
    assert(r.status === 200 && r.text.includes('href="/account/quotes"'), "the tab is on My Activity", r.status);
  } finally {
    await q(`DELETE FROM quote_chat_emails WHERE recipient_id = ANY($1)`, [users]).catch(() => undefined);
    await q(`UPDATE quotes SET appointment_id = NULL WHERE business_id = $1`, [biz]).catch(() => undefined);
    await q(`DELETE FROM appointment_state_logs WHERE appointment_id IN (SELECT id FROM appointments WHERE business_id = $1)`, [biz]).catch(() => undefined);
    await q(`DELETE FROM appointments WHERE business_id = $1`, [biz]).catch(() => undefined);
    await q(`DELETE FROM booking_holds WHERE provider_id = $1`, [biz]).catch(() => undefined);
    await q(`DELETE FROM quotes WHERE business_id = $1`, [biz]).catch((e: Error) => console.error("cleanup quotes", e.message));
    await q(`DELETE FROM messages WHERE conversation_id = $1`, [conv]).catch(() => undefined);
    await q(`DELETE FROM conversations WHERE id = $1`, [conv]).catch(() => undefined);
    await q(`DELETE FROM vendor_subscriptions WHERE business_id = $1`, [biz]).catch(() => undefined);
    await q(`DELETE FROM businesses WHERE id = $1`, [biz]).catch(() => undefined);
    if (tierMade) await q(`DELETE FROM subscription_tiers WHERE id = $1`, [tier.id]).catch(() => undefined);
    await q(`DELETE FROM notifications WHERE user_id = ANY($1)`, [users]).catch(() => undefined);
    await q(`DELETE FROM users WHERE id = ANY($1)`, [users]).catch((e: Error) => console.error("cleanup users", e.message));
    await db.end();
    stub.close();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
