/**
 * Admin events money BFF routes (/api/admin/events/...) HTTP tests.
 *
 * Run with: npx tsx tests/admin-events-bff.http.test.ts
 *
 * LOCAL ONLY. Needs this site running with OUTSYDE_BACKEND_URL pointing at a localhost
 * outsyde-backend on a scratch Postgres (JWT secret "test"). Environment variables:
 *   AE_WEB_URL      default http://localhost:3101   (must be localhost)
 *   AE_BACKEND_URL  default http://localhost:5071   (must be localhost)
 *   AE_PG_URL       default postgresql://outsyde:outsyde@localhost:5432/outsyde_test (localhost only)
 *   AE_BACKEND_DIR  default /home/claude/outsyde-backend; `pg` and `jsonwebtoken` load from it
 * Skips (exit 0) when the web server is not reachable.
 *
 * Seeds the admin info@goutsyde.com (refuses to run if it already exists) and a non admin, and
 * removes everything it created. The POST action cases need the backend POST routes; when the
 * backend answers 404 for them they are skipped with a note.
 */
import { createRequire } from "module";

const WEB = process.env.AE_WEB_URL || "http://localhost:3101";
const BACKEND = process.env.AE_BACKEND_URL || "http://localhost:5071";
const PG_URL = process.env.AE_PG_URL || "postgresql://outsyde:outsyde@localhost:5432/outsyde_test";
const BACKEND_DIR = (process.env.AE_BACKEND_DIR || "/home/claude/outsyde-backend").replace(/\/+$/, "");
const ADMIN_EMAIL = "info@goutsyde.com";

let passed = 0;
let failed = 0;
let skipped = 0;
function assert(cond: boolean, name: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.error(`  FAIL ${name}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 500)); }
}
function skip(name: string, why: string) { skipped++; console.log(`  skip ${name} (${why})`); }
const isLocal = (u: string) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(u).hostname);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = { status: number; body: any };
async function call(base: string, method: string, path: string, opts: { token?: string; body?: unknown; raw?: string } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  if (opts.token) { if (base === BACKEND) headers.Authorization = `Bearer ${opts.token}`; else headers.Cookie = `outsyde_access_token=${opts.token}`; }
  let body: string | undefined;
  if (opts.raw !== undefined) { body = opts.raw; headers["Content-Type"] = "application/json"; }
  else if (opts.body !== undefined) { body = JSON.stringify(opts.body); headers["Content-Type"] = "application/json"; }
  const res = await fetch(new URL(path, base), { method, headers, body });
  return { status: res.status, body: await res.json().catch(() => null) };
}

(async () => {
  for (const u of [WEB, BACKEND, PG_URL]) if (!isLocal(u)) throw new Error("refusing to run: AE_WEB_URL, AE_BACKEND_URL and AE_PG_URL must all be localhost");
  try { await fetch(new URL("/", WEB), { method: "HEAD" }); } catch { console.log(`skipped: web server not reachable at ${WEB}`); process.exit(0); }

  const req = createRequire(`${BACKEND_DIR}/package.json`);
  const pg = req("pg");
  const jwt = req("jsonwebtoken");
  const db = new pg.Client({ connectionString: PG_URL });
  await db.connect();
  const q = async (t: string, p: unknown[] = []) => (await db.query(t, p)).rows as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any

  if ((await q(`SELECT 1 FROM users WHERE lower(email) = $1`, [ADMIN_EMAIL])).length) {
    await db.end();
    throw new Error(`refusing to run: ${ADMIN_EMAIL} already exists in ${PG_URL}`);
  }

  const P = `ae${Date.now().toString(36)}`;
  let adminId = "", userId = "", eventId = "", payoutId = "";
  try {
    adminId = (await q(`INSERT INTO users (id, username, email, is_admin) VALUES (gen_random_uuid(), $1, $2, true) RETURNING id`, [`${P}adm`.slice(0, 20), ADMIN_EMAIL]))[0].id;
    userId = (await q(`INSERT INTO users (id, username, email) VALUES (gen_random_uuid(), $1, $2) RETURNING id`, [`${P}usr`.slice(0, 20), `${P}-user@test.local`]))[0].id;
    const adminTok = jwt.sign({ userId: adminId, isVendor: false, isAdmin: true }, "test", { expiresIn: "1h" });
    const userTok = jwt.sign({ userId, isVendor: false }, "test", { expiresIn: "1h" });
    const ZERO = "00000000-0000-0000-0000-000000000000";
    const BADS = ["a_b", "a.b", "a%20b", "a%2Fb", "x".repeat(65)];

    console.log("GET /api/admin/events");
    let r = await call(WEB, "GET", "/api/admin/events", { token: adminTok });
    assert(r.status === 200 && r.body?.success === true && Array.isArray(r.body?.events), "admin: 200 with the list", r);
    r = await call(WEB, "GET", "/api/admin/events", { token: userTok });
    assert(r.status === 403, "non admin: 403 relayed", r);
    r = await call(WEB, "GET", "/api/admin/events");
    assert(r.status === 401 && r.body?.error === "Not signed in.", "signed out: 401 Not signed in.", r);
    r = await call(WEB, "GET", "/api/admin/events?from=garbage&to=2026-13-99", { token: adminTok });
    assert(r.status === 200 && r.body?.range?.default === true && r.body?.range?.from === null, "from=garbage is dropped (default range, no BAD_RANGE)", r.body?.range);
    r = await call(WEB, "GET", "/api/admin/events?from=2026-01-01", { token: adminTok });
    assert(r.status === 200 && r.body?.range?.default === true, "date only from is dropped too (offset or Z required)", r.body?.range);
    r = await call(WEB, "GET", `/api/admin/events?from=${encodeURIComponent("2026-01-01T00:00:00Z")}`, { token: adminTok });
    assert(r.status === 200 && r.body?.range?.default === false && !!r.body?.range?.from, "ISO date-time with Z is forwarded", r.body?.range);
    r = await call(WEB, "GET", `/api/admin/events?to=${encodeURIComponent("2030-01-01T00:00:00+02:00")}&junk=1`, { token: adminTok });
    assert(r.status === 200 && r.body?.range?.default === false && !!r.body?.range?.to, "ISO date-time with an offset is forwarded", r.body?.range);

    console.log("GET /api/admin/events/:id");
    r = await call(WEB, "GET", `/api/admin/events/${ZERO}`);
    assert(r.status === 401 && r.body?.error === "Not signed in.", "signed out: 401", r);
    r = await call(WEB, "GET", `/api/admin/events/${ZERO}`, { token: userTok });
    assert(r.status === 403, "non admin: 403", r);
    r = await call(WEB, "GET", `/api/admin/events/${ZERO}`, { token: adminTok });
    assert(r.status === 404 && r.body?.code === "EVENT_NOT_FOUND", "unknown valid id: backend 404 relayed", r);
    for (const bad of BADS) {
      r = await call(WEB, "GET", `/api/admin/events/${bad}`, { token: adminTok });
      assert(r.status === 404 && r.body?.error === "Not found.", `bad id "${bad.slice(0, 8)}" is 404 without the backend`, r);
    }

    console.log("POST actions: guards in the BFF");
    for (const path of [`/api/admin/events/payouts/${ZERO}/retry`, `/api/admin/events/payouts/${ZERO}/email-host`, `/api/admin/events/recoveries/${ZERO}/resolve`]) {
      r = await call(WEB, "POST", path, { body: { action: "collected" } });
      assert(r.status === 401 && r.body?.error === "Not signed in.", `signed out: 401 on ${path.split("/").slice(-2).join("/")}`, r);
    }
    for (const bad of BADS) {
      for (const tpl of [`/api/admin/events/payouts/${bad}/retry`, `/api/admin/events/payouts/${bad}/email-host`, `/api/admin/events/recoveries/${bad}/resolve`]) {
        r = await call(WEB, "POST", tpl, { token: adminTok, body: { action: "collected" } });
        assert(r.status === 404, `bad id "${bad.slice(0, 8)}" is 404 on ${tpl.split("/").slice(-3).join("/").replace(bad, ":id")}`, r);
      }
    }
    const resolvePath = `/api/admin/events/recoveries/${ZERO}/resolve`;
    for (const [name, opts] of [
      ["bad action", { body: { action: "refund" } }],
      ["missing action", { body: {} }],
      ["invalid JSON", { raw: "{nope" }],
      ["array body", { raw: "[1]" }],
      ["non string action", { body: { action: 1 } }],
    ] as [string, { body?: unknown; raw?: string }][]) {
      r = await call(WEB, "POST", resolvePath, { token: adminTok, ...opts });
      assert(r.status === 400 && r.body?.code === "INVALID_BODY", `resolve with ${name}: 400 INVALID_BODY`, r);
    }

    console.log("POST actions: against the backend");
    const probe = await call(BACKEND, "POST", `/api/admin/events/payouts/${ZERO}/retry`, { token: adminTok });
    // A backend without the route answers with an HTML or plain 404, not the JSON error envelope.
    const hasRoutes = !(probe.status === 404 && probe.body?.code === undefined && probe.body?.success !== false);
    if (!hasRoutes) {
      for (const n of ["retry on a non review payout is 409", "retry as non admin is 403", "resolve of an unknown recovery is 404", "email-host on a paid payout is refused"]) skip(n, "backend POST routes not present yet");
    } else {
      eventId = (await q(
        `INSERT INTO events (host_user_id, host_type, slug, title, status, starts_at, ends_at, timezone, city, state, published_at, created_at)
         VALUES ($1, 'user', $2, $3, 'published', now() - interval '10 days', now() - interval '9 days', 'America/New_York', 'Freeport', 'NY', now() - interval '30 days', now() - interval '31 days')
         RETURNING id`, [userId, `${P}-ev`, `${P} Paid out`]))[0].id;
      payoutId = (await q(
        `INSERT INTO event_payouts (event_id, destination_type, connected_account_id, gross_cents, deducted_cents, amount_cents, status, paid_at, transfer_id, created_at, updated_at)
         VALUES ($1, 'user', 'acct_test0000', 1000, 0, 1000, 'paid', now() - interval '5 days', $2, now() - interval '6 days', now() - interval '5 days') RETURNING id`,
        [eventId, `tr_${P}`]))[0].id;
      r = await call(WEB, "POST", `/api/admin/events/payouts/${payoutId}/retry`, { token: adminTok });
      assert(r.status === 409 && r.body?.code === "NOT_IN_REVIEW", "retry on a non review payout: 409 relayed", r);
      r = await call(WEB, "POST", `/api/admin/events/payouts/${payoutId}/retry`, { token: userTok });
      assert(r.status === 403, "retry as non admin: 403 relayed", r);
      r = await call(WEB, "POST", resolvePath, { token: adminTok, body: { action: "written_off" } });
      assert(r.status === 404, "resolve of an unknown recovery: backend 404 relayed", r);
      r = await call(WEB, "POST", `/api/admin/events/payouts/${payoutId}/email-host`, { token: adminTok });
      assert(r.status >= 400 && r.status < 500, "email-host on a paid payout is refused (4xx relayed)", r);
      const audit = await q(`SELECT 1 FROM audit_logs WHERE target_id = $1`, [payoutId]);
      assert(audit.length === 0, "refused actions wrote no audit rows", audit);
    }
  } finally {
    try {
      if (payoutId) await db.query(`DELETE FROM audit_logs WHERE target_id = $1`, [payoutId]);
      if (payoutId) await db.query(`DELETE FROM event_payouts WHERE id = $1`, [payoutId]);
      if (eventId) await db.query(`DELETE FROM events WHERE id = $1`, [eventId]);
      if (adminId) await db.query(`DELETE FROM audit_logs WHERE actor_id = $1`, [adminId]);
      if (userId) await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
      if (adminId) await db.query(`DELETE FROM users WHERE id = $1`, [adminId]);
    } catch (e) { console.error("cleanup problem", e); failed++; }
    await db.end();
  }
  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
