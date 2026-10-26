/**
 * Admin push BFF routes (/api/admin/push/...) HTTP tests.
 *
 * Run with: npx tsx tests/admin-push-bff.http.test.ts
 *
 * LOCAL ONLY. Needs this site running with OUTSYDE_BACKEND_URL pointing at a localhost outsyde-backend
 * (branch feat/admin-push, migration 073) on a scratch Postgres, started with EXPO_BASE_URL pointing at a
 * local Expo stub so no push leaves the machine. Environment variables:
 *   AP_WEB_URL      default http://localhost:3077   (must be localhost)
 *   AP_PG_URL       default postgresql://outsyde:outsyde@localhost:5432/outsyde (localhost only)
 *   AP_JWT_SECRET   the backend's JWT_SECRET (default "testjwt")
 *   AP_BACKEND_DIR  default /home/claude/outsyde-backend; `pg` and `jsonwebtoken` load from it
 * Skips (exit 0) when the web server is not reachable.
 *
 * Uses the admin info@goutsyde.com if it exists (creates it otherwise) and seeds accounts with ids
 * starting "apb-", removes everything it created and empties the push tables at the end.
 */
import { createRequire } from "module";

const WEB = process.env.AP_WEB_URL || "http://localhost:3077";
const PG_URL = process.env.AP_PG_URL || "postgresql://outsyde:outsyde@localhost:5432/outsyde";
const SECRET = process.env.AP_JWT_SECRET || "testjwt";
const BACKEND_DIR = (process.env.AP_BACKEND_DIR || "/home/claude/outsyde-backend").replace(/\/+$/, "");

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.error(`  FAIL ${name}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 500)); }
}
const isLocal = (u: string) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(u).hostname);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = { status: number; body: any };
async function call(method: string, path: string, opts: { token?: string; body?: unknown; raw?: string } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Cookie = `outsyde_access_token=${opts.token}`;
  let body: string | undefined;
  if (opts.raw !== undefined) { body = opts.raw; headers["Content-Type"] = "application/json"; }
  else if (opts.body !== undefined) { body = JSON.stringify(opts.body); headers["Content-Type"] = "application/json"; }
  const res = await fetch(new URL(path, WEB), { method, headers, body });
  return { status: res.status, body: await res.json().catch(() => null) };
}

(async () => {
  for (const u of [WEB, PG_URL]) if (!isLocal(u)) throw new Error("refusing to run: AP_WEB_URL and AP_PG_URL must be localhost");
  try { await fetch(new URL("/", WEB), { method: "HEAD" }); } catch { console.log(`skipped: web server not reachable at ${WEB}`); process.exit(0); }

  const req = createRequire(`${BACKEND_DIR}/package.json`);
  const pg = req("pg");
  const jwt = req("jsonwebtoken");
  const db = new pg.Client({ connectionString: PG_URL });
  await db.connect();
  const q = async (t: string, p: unknown[] = []) => (await db.query(t, p)).rows as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any

  let adminId = (await q(`SELECT id FROM users WHERE lower(email) = 'info@goutsyde.com'`))[0]?.id as string | undefined;
  const createdAdmin = !adminId;
  if (!adminId) {
    adminId = "apb-admin";
    await q(`INSERT INTO users (id, email, username, is_admin) VALUES ('apb-admin', 'info@goutsyde.com', 'apbadmin', true)`);
  }
  await q(`INSERT INTO users (id, email, username, name, expo_push_token) VALUES ('apb-cust', 'apb-cust@x.test', 'apbcust', 'Apb Customer', 'ExponentPushToken[apb-cust]')`);
  const admin = jwt.sign({ userId: adminId, isVendor: false, isAdmin: true }, SECRET, { expiresIn: "1h" });
  const user = jwt.sign({ userId: "apb-cust", isVendor: false }, SECRET, { expiresIn: "1h" });

  try {
    // ── every BFF: 401 without the cookie, 403 for a non admin (from the backend) ──
    const routes: [string, string][] = [
      ["GET", "/api/admin/push/audiences"], ["GET", "/api/admin/push/screens"], ["GET", "/api/admin/push/limits"],
      ["GET", "/api/admin/push/people?q=apb"], ["GET", "/api/admin/push/sends"], ["GET", "/api/admin/push/sends/x"],
      ["POST", "/api/admin/push/test"], ["POST", "/api/admin/push/sends"],
    ];
    const validPost: Record<string, unknown> = {
      "/api/admin/push/test": { title: "T", body: "B" },
      "/api/admin/push/sends": { audience: "all", title: "T", body: "B", clientKey: "x" },
    };
    for (const [m, p] of routes) {
      const b = m === "POST" ? validPost[p] : undefined;
      const r1 = await call(m, p, { body: b });
      const r2 = await call(m, p, { token: user, body: b });
      assert(r1.status === 401 && r2.status === 403, `${m} ${p}: 401 signed out, 403 non admin`, [r1.status, r2.status]);
    }

    // ── reads forward the backend answer ──
    let r = await call("GET", "/api/admin/push/screens", { token: admin });
    assert(r.status === 200 && Array.isArray(r.body?.screens) && r.body.screens.length === 24, "screens forwarded", r.body);
    r = await call("GET", "/api/admin/push/audiences", { token: admin });
    assert(r.status === 200 && typeof r.body?.counts?.all === "number", "audiences forwarded", r.body);
    r = await call("GET", "/api/admin/push/limits", { token: admin });
    assert(r.status === 200 && r.body?.max === 3, "limits forwarded", r.body);
    r = await call("GET", "/api/admin/push/people?q=a", { token: admin });
    assert(r.status === 200 && Array.isArray(r.body?.people) && r.body.people.length === 0, "one letter search answers empty without calling the backend", r.body);
    r = await call("GET", "/api/admin/push/people?q=apb", { token: admin });
    assert(r.status === 200 && r.body.people.some((p: { id: string }) => p.id === "apb-cust"), "people search forwarded", r.body);

    // ── BFF checks on bodies ──
    r = await call("POST", "/api/admin/push/sends", { token: admin, raw: "not json" });
    assert(r.status === 400, "bad JSON: 400", r);
    r = await call("POST", "/api/admin/push/sends", { token: admin, body: { audience: "everyone", title: "T", body: "B", clientKey: "k" } });
    assert(r.status === 400, "unknown audience: 400", r);
    r = await call("POST", "/api/admin/push/sends", { token: admin, body: { audience: "all", title: "T", body: "B" } });
    assert(r.status === 400, "missing clientKey: 400", r);
    r = await call("POST", "/api/admin/push/sends", { token: admin, body: { audience: "picked", userIds: [], title: "T", body: "B", clientKey: "k" } });
    assert(r.status === 400, "picked with nobody: 400", r);
    r = await call("POST", "/api/admin/push/sends", { token: admin, body: { audience: "consumers", title: "T", body: "B", screen: "business_dashboard", clientKey: "k" } });
    assert(r.status === 400 && /screen/i.test(JSON.stringify(r.body)), "backend refusal passed through (vendor screen for consumers)", r.body);

    // ── a real send through the BFF, then the same key again ──
    const key = `apb-${Date.now()}`;
    const body = { audience: "picked", userIds: ["apb-cust"], title: "BFF test push", body: "From the BFF test.", screen: "points", clientKey: key, extra: "dropped" };
    r = await call("POST", "/api/admin/push/sends", { token: admin, body });
    assert(r.status === 202 && r.body?.recipients === 1 && typeof r.body?.sendId === "string", "send: 202 with 1 recipient", r.body);
    const sendId = r.body?.sendId;
    let d: Res = { status: 0, body: null };
    for (let i = 0; i < 30; i++) { d = await call("GET", `/api/admin/push/sends/${sendId}`, { token: admin }); if (d.body?.send?.status === "done") break; await new Promise((ok) => setTimeout(ok, 150)); }
    assert(d.status === 200 && d.body?.send?.status === "done" && d.body.send.screen === "points", "send detail forwarded", d.body?.send);
    r = await call("POST", "/api/admin/push/sends", { token: admin, body });
    assert(r.status === 200 && r.body?.sendId === sendId && r.body?.existing === true, "same clientKey: same send", r.body);
    r = await call("GET", "/api/admin/push/sends?limit=5&before=bogus-but-short", { token: admin });
    assert(r.status === 400, "bad before date: backend 400 passed through", r);
    r = await call("GET", "/api/admin/push/sends?limit=5", { token: admin });
    assert(r.status === 200 && r.body?.sends?.[0]?.id === sendId, "history forwarded", r.body?.sends?.[0]);
  } finally {
    await q(`DELETE FROM notifications WHERE user_id LIKE 'apb-%'`);
    await q(`DELETE FROM push_log`); await q(`DELETE FROM push_sends`);
    if (createdAdmin) await q(`DELETE FROM users WHERE id = 'apb-admin'`);
    await q(`DELETE FROM users WHERE id LIKE 'apb-%'`);
    await db.end();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
