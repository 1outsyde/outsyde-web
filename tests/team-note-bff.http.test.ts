/**
 * Event Team note BFF routes (p4-team step 9d-2, backend #403) HTTP tests: the two pass throughs relay the backend's
 * answer unchanged, keep the browser's User-Agent on the record, and check the body here.
 *
 * LOCAL ONLY. Same setup as team-links-bff.http.test.ts: this site with OUTSYDE_BACKEND_URL pointing at a localhost
 * outsyde-backend (JWT secret "test") on a scratch Postgres with migrations up to 093.
 *   EV_WEB_URL, EV_BACKEND_URL, EV_PG_URL (all localhost), EV_BACKEND_DIR (for pg and jsonwebtoken).
 * Run: npx tsx tests/team-note-bff.http.test.ts (skips when EV_WEB_URL is unset).
 *
 * Mutation checks: drop the User-Agent header in accept/route.ts → "the browser is kept on the record" fails;
 * point GET at /api/events/host-agreement → "the note, same as the backend" fails.
 */
import { createRequire } from "module";

const WEB = process.env.EV_WEB_URL;
const BACKEND = process.env.EV_BACKEND_URL;
const PG_URL = process.env.EV_PG_URL;
let passed = 0, failed = 0;
function assert(cond: boolean, name: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ok  ${name}`); } else { failed++; console.error(`  FAIL ${name}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 500)); }
}
const isLocal = (u: string) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(u).hostname);
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
async function call(base: string, method: string, path: string, o: { token?: string; body?: unknown; raw?: string; ua?: string } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  if (o.token) { if (base === BACKEND) headers.Authorization = `Bearer ${o.token}`; else headers.Cookie = `outsyde_access_token=${o.token}`; }
  if (o.ua) headers["User-Agent"] = o.ua;
  let body: string | undefined;
  if (o.raw !== undefined) { body = o.raw; headers["Content-Type"] = "application/json"; }
  else if (o.body !== undefined) { body = JSON.stringify(o.body); headers["Content-Type"] = "application/json"; }
  const res = await fetch(new URL(path, base), { method, headers, body });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const relayed = (w: Res, b: Res) => w.status === b.status && (JSON.stringify(w.body) === JSON.stringify(b.body)
  || (b.body?.error?.code && w.body?.code === b.body.error.code));

(async () => {
  if (!WEB) { console.log("skipped: set EV_WEB_URL, EV_BACKEND_URL, EV_PG_URL, EV_BACKEND_DIR to run"); process.exit(0); }
  if (!BACKEND || !PG_URL || !isLocal(WEB) || !isLocal(BACKEND) || !isLocal(PG_URL)) throw new Error("refusing to run: all URLs must be localhost");
  if (!process.env.EV_BACKEND_DIR) throw new Error("set EV_BACKEND_DIR");
  const req = createRequire(`${process.env.EV_BACKEND_DIR.replace(/\/+$/, "")}/package.json`);
  const pg = req("pg");
  const jwt = req("jsonwebtoken");
  const db = new pg.Client({ connectionString: PG_URL });
  await db.connect();
  const q = async (t: string, p: unknown[] = []) => (await db.query(t, p)).rows as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const tok = (id: string) => jwt.sign({ userId: id, isVendor: false }, "test", { expiresIn: "1h" });
  const P = `tnw${Date.now().toString(36)}`;
  const users: string[] = [];
  const user = async (s: string) => {
    const id = (await q(`INSERT INTO users (id, email, name, first_name, username, is_active) VALUES (gen_random_uuid(), $1, $2, $3, $4, true) RETURNING id`,
      [`${P}-${s}@test.local`, `Person ${s}`, `First${s}`, `${P}${s}`.slice(0, 24)]))[0].id as string;
    users.push(id); return id;
  };
  try {
    const ana = await user("ana"), bo = await user("bo");
    const A = tok(ana), B = tok(bo);

    console.log("read");
    let w = await call(WEB, "GET", "/api/events/team-note");
    assert(w.status === 401, "signed out: 401 relayed", w);
    const [wn, bn] = [await call(WEB, "GET", "/api/events/team-note", { token: A }), await call(BACKEND, "GET", "/api/events/team-note", { token: A })];
    assert(wn.status === 200 && JSON.stringify(wn.body) === JSON.stringify(bn.body) && wn.body?.note?.points?.length === 6 && wn.body.note.accepted === false,
      "the note, same as the backend", wn.body);
    const version = wn.body?.note?.version;

    console.log("accept");
    w = await call(WEB, "POST", "/api/events/team-note/accept", { token: A, raw: "[1]" });
    assert(w.status === 400 && w.body?.code === "INVALID_JSON", "a body that isn't an object: 400 here", w);
    w = await call(WEB, "POST", "/api/events/team-note/accept", { token: A, body: { version: "2020-01-01" } });
    const b = await call(BACKEND, "POST", "/api/events/team-note/accept", { token: B, body: { version: "2020-01-01" } });
    assert(w.status === 409 && relayed(w, b), "an older version: the backend's 409 relayed", { w, b });
    w = await call(WEB, "POST", "/api/events/team-note/accept", { body: { version } });
    assert(w.status === 401, "signed out can't accept", w);
    w = await call(WEB, "POST", "/api/events/team-note/accept", { token: A, body: { version }, ua: "TeamNoteBrowser/9" });
    assert(w.status === 200 && w.body?.note?.accepted === true, "accepted through the site", w.body);
    const rec = await q(`SELECT user_agent, version FROM event_team_note_acceptances WHERE user_id = $1`, [ana]);
    assert(rec.length === 1 && rec[0].user_agent === "TeamNoteBrowser/9" && rec[0].version === version, "the browser is kept on the record", rec);
    w = await call(WEB, "GET", "/api/events/team-note", { token: A });
    assert(w.body?.note?.accepted === true, "read back: accepted", w.body);
  } finally {
    await q(`DELETE FROM event_team_note_acceptances WHERE user_id = ANY($1)`, [users]).catch(() => {});
    await q(`DELETE FROM users WHERE id = ANY($1)`, [users]).catch(() => {});
    await db.end();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
