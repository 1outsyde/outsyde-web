/**
 * Events BFF routes (/api/events/...) HTTP tests.
 *
 * Run with: npx tsx tests/events-bff.http.test.ts
 *
 * LOCAL ONLY. Needs this site running with OUTSYDE_BACKEND_URL pointing at a localhost
 * outsyde-backend on a scratch Postgres (JWT secret "test"). Environment variables:
 *   EV_WEB_URL      e.g. http://localhost:3100   (must be localhost)
 *   EV_BACKEND_URL  e.g. http://localhost:5071   (must be localhost; used to seed and to compare)
 *   EV_PG_URL       the backend's scratch database (localhost only; seeds users, cleans up)
 *   EV_BACKEND_DIR  path to an outsyde-backend checkout; `pg` and `jsonwebtoken` load from it
 * Skips (exit 0) when EV_WEB_URL is unset.
 *
 * The backend-unreachable (502) case runs in process: each route handler is imported and called
 * with OUTSYDE_BACKEND_URL pointed at a closed port, so no second web instance is needed.
 */
import { createRequire } from "module";

const WEB = process.env.EV_WEB_URL;
const BACKEND = process.env.EV_BACKEND_URL;
const PG_URL = process.env.EV_PG_URL;

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.error(`  FAIL ${name}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 500)); }
}
const isLocal = (u: string) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(u).hostname);

type Res = { status: number; body: any };
async function call(base: string, method: string, path: string, opts: { token?: string; cookie?: string; body?: unknown; raw?: string } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  if (opts.token) { if (base === BACKEND) headers.Authorization = `Bearer ${opts.token}`; else headers.Cookie = `outsyde_access_token=${opts.token}`; }
  if (opts.cookie) headers.Cookie = opts.cookie;
  let body: string | undefined;
  if (opts.raw !== undefined) { body = opts.raw; headers["Content-Type"] = "application/json"; }
  else if (opts.body !== undefined) { body = JSON.stringify(opts.body); headers["Content-Type"] = "application/json"; }
  const res = await fetch(new URL(path, base), { method, headers, body });
  return { status: res.status, body: await res.json().catch(() => null) };
}

(async () => {
  if (!WEB) { console.log("skipped: set EV_WEB_URL, EV_BACKEND_URL, EV_PG_URL, EV_BACKEND_DIR to run"); process.exit(0); }
  if (!BACKEND || !PG_URL || !isLocal(WEB) || !isLocal(BACKEND) || !isLocal(PG_URL)) throw new Error("refusing to run: EV_WEB_URL, EV_BACKEND_URL and EV_PG_URL must all be localhost");
  if (!process.env.EV_BACKEND_DIR) throw new Error("set EV_BACKEND_DIR to an outsyde-backend checkout (for pg and jsonwebtoken)");
  const req = createRequire(`${process.env.EV_BACKEND_DIR.replace(/\/+$/, "")}/package.json`);
  const pg = req("pg");
  const jwt = req("jsonwebtoken");
  const db = new pg.Client({ connectionString: PG_URL });
  await db.connect();
  const q = async (t: string, p: unknown[] = []) => (await db.query(t, p)).rows as any[];

  const P = `eb${Date.now().toString(36)}`;
  const mkUser = async (s: string) => (await q(
    `INSERT INTO users (id, email, name, first_name, username) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id`,
    [`${P}-${s}@test.local`, `Guest ${s} Lastname`, `Guest${s}`, `${P}${s}`.slice(0, 20)],
  ))[0].id as string;
  const tok = (id: string) => jwt.sign({ userId: id, isVendor: false }, "test", { expiresIn: "1h" });
  const host = await mkUser("host");
  const guest = await mkUser("guest");
  const hostTok = tok(host);
  const guestTok = tok(guest);
  const ZERO = "00000000-0000-0000-0000-000000000000";
  const inDays = (d: number, h = 0) => new Date(Date.now() + d * 86400000 + h * 3600000).toISOString();

  try {
    // Seed a published free event straight on the backend.
    const created = await call(BACKEND, "POST", "/api/events", { token: hostTok, body: { title: `${P} Block Party`, startsAt: inDays(7), endsAt: inDays(7, 6), timezone: "America/New_York", city: "Freeport", state: "NY", capacity: 50 } });
    if (created.status !== 201) throw new Error(`event create failed ${JSON.stringify(created)}`);
    const ev = created.body.event;
    const tt = await call(BACKEND, "POST", `/api/events/${ev.id}/ticket-types`, { token: hostTok, body: { name: "Free RSVP", priceCents: 0, quantity: 20 } });
    const type = tt.body.ticketType;
    const pub = await call(BACKEND, "POST", `/api/events/${ev.id}/publish`, { token: hostTok });
    if (pub.status !== 200) throw new Error(`publish failed ${JSON.stringify(pub)}`);

    console.log("GET /api/events/slug/:slug");
    let r = await call(WEB, "GET", `/api/events/slug/${ev.slug}`);
    assert(r.status === 200 && r.body?.event?.id === ev.id, "works with no cookie", r);
    r = await call(WEB, "GET", `/api/events/slug/${ev.slug.toUpperCase()}`);
    assert(r.status === 200 && r.body?.event?.id === ev.id, "uppercase slug is lowercased", r);
    r = await call(WEB, "GET", `/api/events/slug/${ev.slug}`, { cookie: "outsyde_access_token=not-a-real-token" });
    assert(r.status === 200 && r.body?.event?.id === ev.id, "bad token is just anonymous", r);
    r = await call(WEB, "GET", `/api/events/slug/${ev.slug}`, { token: hostTok });
    const direct = await call(BACKEND, "GET", `/api/events/slug/${ev.slug}`, { token: hostTok });
    assert(r.status === 200 && JSON.stringify(r.body.event.viewer ?? null) === JSON.stringify(direct.body.event.viewer ?? null), "Bearer is forwarded (viewer matches a direct backend call)", { web: r.body?.event?.viewer, direct: direct.body?.event?.viewer });
    r = await call(WEB, "GET", `/api/events/slug/${P}-missing`);
    assert(r.status === 404 && r.body?.success === false && r.body?.code === "EVENT_NOT_FOUND" && r.body?.error === "Event not found.", "unknown slug: backend 404 relayed in the flat shape", r);
    for (const bad of ["Bad_Slug", "a.b", "a%20b", "a%2Fb", "x".repeat(81)]) {
      r = await call(WEB, "GET", `/api/events/slug/${bad}`);
      assert(r.status === 404 && r.body?.success === false && r.body?.code === "NOT_FOUND" && r.body?.error === "Not found.", `invalid slug "${bad.slice(0, 12)}" is 404 without the backend`, r);
    }

    console.log("POST /api/events/:id/rsvp");
    r = await call(WEB, "POST", `/api/events/${ev.id}/rsvp`, { body: { ticketTypeId: type.id } });
    assert(r.status === 401 && r.body?.code === "NO_AUTH", "signed out: 401 passes through", r);
    r = await call(WEB, "POST", `/api/events/${ev.id}/rsvp`, { token: guestTok, body: { ticketTypeId: ZERO } });
    assert(r.status === 404 && r.body?.code === "TICKET_TYPE_NOT_FOUND", "body is forwarded (backend names the unknown ticket type)", r);
    r = await call(WEB, "POST", `/api/events/${ev.id}/rsvp`, { token: guestTok, raw: "{nope" });
    assert(r.status === 400 && r.body?.code === "INVALID_JSON" && typeof r.body?.error === "string", "invalid JSON is 400", r);
    r = await call(WEB, "POST", `/api/events/${ev.id}/rsvp`, { token: guestTok, raw: "[1]" });
    assert(r.status === 400 && r.body?.code === "INVALID_JSON" && typeof r.body?.error === "string", "array body is 400", r);
    r = await call(WEB, "POST", `/api/events/not-a-uuid/rsvp`, { token: guestTok, body: { ticketTypeId: type.id } });
    assert(r.status === 404 && r.body?.code === "NOT_FOUND" && r.body?.error === "Not found.", "non-UUID event id is 404 without the backend", r);
    r = await call(WEB, "POST", `/api/events/${ev.id}/rsvp`, { token: guestTok, body: { ticketTypeId: type.id, quantity: 1, idempotencyKey: `${P}-k1` } });
    assert(r.status >= 200 && r.status < 300 && !!r.body?.order?.id, "RSVP succeeds with method, path, body and Bearer forwarded", r);
    const orderId: string = r.body?.order?.id;
    const again = await call(WEB, "POST", `/api/events/${ev.id}/rsvp`, { token: guestTok, body: { ticketTypeId: type.id, quantity: 1, idempotencyKey: `${P}-k1` } });
    assert(again.status >= 200 && again.status < 300 && again.body?.order?.id === orderId, "same idempotencyKey in the body replays the same order", again);

    console.log("POST /api/events/:id/checkout");
    r = await call(WEB, "POST", `/api/events/${ev.id}/checkout`, { body: { ticketTypeId: type.id } });
    assert(r.status === 401, "signed out: 401 passes through", r);
    const dCheckout = await call(BACKEND, "POST", `/api/events/${ev.id}/checkout`, { token: guestTok, body: { ticketTypeId: type.id, quantity: 1 } });
    r = await call(WEB, "POST", `/api/events/${ev.id}/checkout`, { token: guestTok, body: { ticketTypeId: type.id, quantity: 1 } });
    assert(r.status === dCheckout.status && r.body?.code === dCheckout.body?.error?.code, "same status and code as a direct backend call", { web: r, direct: dCheckout });
    r = await call(WEB, "POST", `/api/events/${ZERO.slice(0, 35)}x/checkout`, { token: guestTok, body: {} });
    assert(r.status === 404 && r.body?.code === "NOT_FOUND" && r.body?.error === "Not found.", "bad id is 404 without the backend", r);
    r = await call(WEB, "POST", `/api/events/${ev.id}/checkout`, { token: guestTok, raw: "" });
    assert(r.status === 400 && r.body?.code === "INVALID_JSON" && typeof r.body?.error === "string", "empty body is 400", r);

    console.log("GET /api/events/orders/:orderId");
    r = await call(WEB, "GET", `/api/events/orders/${orderId}`);
    assert(r.status === 401, "signed out: 401 passes through", r);
    r = await call(WEB, "GET", `/api/events/orders/${orderId}`, { token: guestTok });
    assert(r.status === 200 && (r.body?.order?.id === orderId), "buyer reads the order", r);
    r = await call(WEB, "GET", `/api/events/orders/${orderId}`, { token: hostTok });
    const dOther = await call(BACKEND, "GET", `/api/events/orders/${orderId}`, { token: hostTok });
    assert(r.status === dOther.status && r.status !== 200, "someone else's order is refused like the backend does", { web: r.status, direct: dOther.status });
    for (const bad of ["not-a-uuid", "..%2F..%2Fadmin", `${orderId}%2Fcancel`, "1"]) {
      r = await call(WEB, "GET", `/api/events/orders/${bad}`, { token: guestTok });
      assert(r.status === 404 && r.body?.code === "NOT_FOUND" && r.body?.error === "Not found.", `bad order id "${bad.slice(0, 16)}" is 404`, r);
    }

    console.log("GET /api/events/me/tickets");
    r = await call(WEB, "GET", `/api/events/me/tickets`);
    assert(r.status === 401 && r.body?.success === false && r.body?.code === "NO_AUTH" && typeof r.body?.error === "string", "signed out: 401 passes through in the flat shape", r);
    r = await call(WEB, "GET", `/api/events/me/tickets`, { token: guestTok });
    const dTix = await call(BACKEND, "GET", `/api/events/me/tickets`, { token: guestTok });
    assert(r.status === 200 && JSON.stringify(r.body) === JSON.stringify(dTix.body) && JSON.stringify(r.body).includes(ev.id), "same body as the backend, includes the RSVP", r);

    console.log("POST /api/events/orders/:orderId/cancel and /refund");
    r = await call(WEB, "POST", `/api/events/orders/${orderId}/refund`);
    assert(r.status === 401, "refund signed out: 401", r);
    r = await call(WEB, "POST", `/api/events/orders/${orderId}/cancel`);
    assert(r.status === 401, "cancel signed out: 401", r);
    r = await call(WEB, "POST", `/api/events/orders/not-a-uuid/cancel`, { token: guestTok });
    assert(r.status === 404 && r.body?.code === "NOT_FOUND" && r.body?.error === "Not found.", "cancel with bad id is 404", r);
    r = await call(WEB, "POST", `/api/events/orders/not-a-uuid/refund`, { token: guestTok });
    assert(r.status === 404 && r.body?.code === "NOT_FOUND" && r.body?.error === "Not found.", "refund with bad id is 404", r);
    const dRefund = await call(BACKEND, "POST", `/api/events/orders/${orderId}/refund`, { token: guestTok });
    r = await call(WEB, "POST", `/api/events/orders/${orderId}/refund`, { token: guestTok });
    assert(r.status === dRefund.status && r.body?.code === dRefund.body?.error?.code, "refund relays the backend answer for a free order", { web: r, direct: dRefund });
    r = await call(WEB, "POST", `/api/events/orders/${orderId}/cancel`, { token: guestTok });
    assert(r.status === 200, "free RSVP cancel succeeds", r);
    r = await call(WEB, "GET", `/api/events/orders/${orderId}`, { token: guestTok });
    assert(r.status === 200 && /cancel/i.test(JSON.stringify(r.body?.order?.status)), "order now shows cancelled", r.body?.order);

    console.log("GET /api/events/payouts/status");
    r = await call(WEB, "GET", `/api/events/payouts/status`);
    assert(r.status === 401, "signed out: 401", r);
    for (const ht of ["user", "business", "photographer"]) {
      const d = await call(BACKEND, "GET", `/api/events/payouts/status?hostType=${ht}`, { token: hostTok });
      r = await call(WEB, "GET", `/api/events/payouts/status?hostType=${ht}`, { token: hostTok });
      assert(r.status === d.status && JSON.stringify(r.body?.code ?? null) === JSON.stringify(d.body?.error?.code ?? null), `hostType=${ht} reaches the backend (same status ${d.status})`, { web: r, direct: d });
    }
    const dDefault = await call(BACKEND, "GET", `/api/events/payouts/status?hostType=user`, { token: hostTok });
    r = await call(WEB, "GET", `/api/events/payouts/status`, { token: hostTok });
    assert(r.status === dDefault.status, "hostType defaults to user", { web: r.status, direct: dDefault.status });
    for (const bad of ["admin", "USER", "user&x=1", ""]) {
      r = await call(WEB, "GET", `/api/events/payouts/status?hostType=${encodeURIComponent(bad)}`, { token: hostTok });
      assert(r.status === 400 && r.body?.code === "INVALID_HOST_TYPE" && typeof r.body?.error === "string", `hostType="${bad}" is 400 INVALID_HOST_TYPE`, r);
    }

    console.log("POST /api/events/payouts/setup-link");
    r = await call(WEB, "POST", `/api/events/payouts/setup-link`, { body: { web: true } });
    assert(r.status === 401, "signed out: 401", r);
    r = await call(WEB, "POST", `/api/events/payouts/setup-link`, { token: guestTok, body: { web: false, hostType: "business", evil: 1 } });
    const dSetup = await call(BACKEND, "POST", `/api/events/payouts/setup-link`, { token: guestTok, body: { web: true } });
    assert(r.status === dSetup.status && r.body?.code === dSetup.body?.error?.code, "forwards a fixed { web: true } body, ignores the client body", { web: r, direct: dSetup });

    console.log("GET /api/events/stripe-config");
    r = await call(WEB, "GET", `/api/events/stripe-config`);
    assert(r.status === 200 && typeof r.body?.publishableKey === "string" && r.body.publishableKey.startsWith("pk_"), "returns the publishable key", r);

    // ===== Task 2: public event page /e/[slug] =====
    console.log("Page /e/[slug]");
    const html = async (path: string, cookie?: string) => {
      const res = await fetch(new URL(path, WEB), { headers: cookie ? { Cookie: cookie } : {}, redirect: "manual" });
      return { status: res.status, text: await res.text() };
    };
    const hiddenEv = (await call(BACKEND, "POST", "/api/events", { token: hostTok, body: {
      title: `${P} Secret Garden`, description: "A quiet night.", startsAt: inDays(9), endsAt: inDays(9, 5), timezone: "America/New_York",
      venueName: "Hidden Venue Hall", addressLine1: "77 Secretive Street", city: "Freeport", state: "NY", postalCode: "11520",
      addressVisibility: "ticket_holders", visibility: "unlisted", capacity: 30 } })).body.event;
    await call(BACKEND, "POST", `/api/events/${hiddenEv.id}/ticket-types`, { token: hostTok, body: { name: "Free RSVP", priceCents: 0, quantity: 10 } });
    await call(BACKEND, "POST", `/api/events/${hiddenEv.id}/publish`, { token: hostTok });
    let pg = await html(`/e/${ev.slug}`);
    assert(pg.status === 200 && pg.text.includes(`<title>${P} Block Party | Outsyde</title>`), "public event page: 200 with the title in <title>", { status: pg.status, title: pg.text.match(/<title>[^<]*<\/title>/)?.[0] });
    assert(pg.text.includes(`${P} Block Party`) && pg.text.includes("Free RSVP"), "public event page: title and ticket types are in the server HTML");
    assert(!/<meta name="robots" content="noindex/i.test(pg.text), "public event page is indexable");
    pg = await html(`/e/${hiddenEv.slug}`);
    assert(pg.status === 200, "hidden address event page: 200", pg.status);
    assert(!pg.text.includes("Hidden Venue Hall") && !pg.text.includes("Secretive") && !pg.text.includes("11520"), "hidden address event: no venue, street or postal code anywhere in the HTML");
    assert(/<meta name="robots" content="noindex/i.test(pg.text), "unlisted event: noindex meta", pg.text.match(/<meta name="robots"[^>]*>/)?.[0]);
    assert(pg.text.includes("Freeport, NY"), "hidden address event shows city and state");
    pg = await html(`/e/${P}-no-such-event`);
    assert(pg.status === 404, "unknown slug with no cookie: 404 status", pg.status);
    pg = await html(`/e/${P}-no-such-event`, `outsyde_access_token=${guestTok}`);
    assert(pg.status === 200 && /Loading/.test(pg.text), "unknown slug WITH a cookie: loading shell (client decides)", pg.status);
    const hiddenTypeId = (await call(WEB, "GET", `/api/events/slug/${hiddenEv.slug}`)).body.ticketTypes[0].id;
    const pageRsvp = await call(WEB, "POST", `/api/events/${hiddenEv.id}/rsvp`, { token: guestTok, body: { ticketTypeId: hiddenTypeId, quantity: 1, idempotencyKey: `${P}-page1` } });
    assert(pageRsvp.status === 201 && pageRsvp.body?.order?.tickets?.length === 1, "free RSVP through the page's BFF works (201, ticket issued)", pageRsvp);
    const holderView = await call(WEB, "GET", `/api/events/slug/${hiddenEv.slug}`, { token: guestTok });
    assert(holderView.body?.event?.viewerHasTicket === true && holderView.body?.event?.addressLine1 === "77 Secretive Street", "client refetch gives the holder the address", holderView.body?.event);

    console.log("Backend unreachable (in process, closed port)");
    process.env.OUTSYDE_BACKEND_URL = "http://127.0.0.1:1";
    const { NextRequest } = await import("next/server");
    const mk = (path: string, method = "GET", body?: unknown) => new NextRequest(new URL(path, "http://localhost:3100"), { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { cookie: "outsyde_access_token=x", "content-type": "application/json" } });
    const cases: Array<[string, () => Promise<Response>]> = [];
    const route = async (p: string) => import(p);
    cases.push(["slug", async () => (await route("../app/api/events/slug/[slug]/route")).GET(mk("/x"), { params: Promise.resolve({ slug: "abc" }) })]);
    cases.push(["rsvp", async () => (await route("../app/api/events/[id]/rsvp/route")).POST(mk("/x", "POST", { ticketTypeId: ZERO }), { params: Promise.resolve({ id: ZERO }) })]);
    cases.push(["checkout", async () => (await route("../app/api/events/[id]/checkout/route")).POST(mk("/x", "POST", { ticketTypeId: ZERO }), { params: Promise.resolve({ id: ZERO }) })]);
    cases.push(["order", async () => (await route("../app/api/events/orders/[orderId]/route")).GET(mk("/x"), { params: Promise.resolve({ orderId: ZERO }) })]);
    cases.push(["cancel", async () => (await route("../app/api/events/orders/[orderId]/cancel/route")).POST(mk("/x", "POST"), { params: Promise.resolve({ orderId: ZERO }) })]);
    cases.push(["refund", async () => (await route("../app/api/events/orders/[orderId]/refund/route")).POST(mk("/x", "POST"), { params: Promise.resolve({ orderId: ZERO }) })]);
    cases.push(["me/tickets", async () => (await route("../app/api/events/me/tickets/route")).GET(mk("/x"))]);
    cases.push(["payouts/status", async () => (await route("../app/api/events/payouts/status/route")).GET(mk("/x?hostType=user"))]);
    cases.push(["payouts/setup-link", async () => (await route("../app/api/events/payouts/setup-link/route")).POST(mk("/x", "POST", {}))]);
    cases.push(["stripe-config", async () => (await route("../app/api/events/stripe-config/route")).GET(mk("/x"))]);
    for (const [name, run] of cases) {
      const res = await run();
      const body = await res.json().catch(() => null);
      assert(res.status === 502 && typeof body?.error === "string", `${name}: 502 JSON, no throw`, { status: res.status, body });
    }
  } finally {
    await q(`DELETE FROM tickets WHERE event_id IN (SELECT id FROM events WHERE host_user_id = ANY($1))`, [[host]]).catch(() => {});
    await q(`DELETE FROM users WHERE email LIKE $1`, [`${P}-%`]).catch(() => {});
    await db.end();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
