/**
 * Event team invite link BFF routes (p4-team step 9-0, backend #402) HTTP tests: every new pass through, its own
 * checks (ids, codes, bodies) and that it relays the backend's answer unchanged.
 *
 * LOCAL ONLY. Same setup as events-bff.http.test.ts: this site running with OUTSYDE_BACKEND_URL pointing at a
 * localhost outsyde-backend (JWT secret "test") on a scratch Postgres with migrations up to 092.
 *   EV_WEB_URL, EV_BACKEND_URL, EV_PG_URL (all localhost), EV_BACKEND_DIR (for pg and jsonwebtoken).
 * Run: npx tsx tests/team-links-bff.http.test.ts (skips when EV_WEB_URL is unset).
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
async function call(base: string, method: string, path: string, o: { token?: string; body?: unknown; raw?: string } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  if (o.token) { if (base === BACKEND) headers.Authorization = `Bearer ${o.token}`; else headers.Cookie = `outsyde_access_token=${o.token}`; }
  let body: string | undefined;
  if (o.raw !== undefined) { body = o.raw; headers["Content-Type"] = "application/json"; }
  else if (o.body !== undefined) { body = JSON.stringify(o.body); headers["Content-Type"] = "application/json"; }
  const res = await fetch(new URL(path, base), { method, headers, body });
  return { status: res.status, body: await res.json().catch(() => null) };
}
/** The site relays the backend's status and body (the backend's { error: { code, message } } flattens to { error, code }). */
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
  const P = `tk${Date.now().toString(36)}`;
  const users: string[] = [], events: string[] = [];
  const user = async (s: string) => {
    const id = (await q(`INSERT INTO users (id, email, name, first_name, username, is_active) VALUES (gen_random_uuid(), $1, $2, $3, $4, true) RETURNING id`,
      [`${P}-${s}@test.local`, `Person ${s}`, `First${s}`, `${P}${s}`.slice(0, 24)]))[0].id as string;
    users.push(id); return id;
  };

  try {
    const host = await user("host"), co = await user("co"), ana = await user("ana"), bo = await user("bo");
    const ev = (await q(`INSERT INTO events (host_user_id, slug, title, status, starts_at, ends_at, timezone, published_at)
      VALUES ($1, $2, $3, 'published', now() + interval '1 day', now() + interval '30 hours', 'America/New_York', now() - interval '5 days') RETURNING id`,
      [host, `${P}-night`, `${P} night`]))[0].id as string;
    events.push(ev);
    await q(`INSERT INTO event_door_members (event_id, member_user_id, added_by_user_id, role, cohost_level, accepted_at) VALUES ($1, $2, $3, 'cohost', 'team', now())`, [ev, co, host]);
    const H = tok(host), C = tok(co), A = tok(ana), B = tok(bo);

    console.log("make a link");
    let w = await call(WEB, "POST", `/api/events/${ev}/team/links`, { token: H, body: { scope: "event", role: "security", pay: { payType: "fixed", fixedCents: 16000 } } });
    assert(w.status === 201 && w.body?.success && /^[A-HJ-NP-Z2-9]{12}$/.test(w.body.link?.code ?? "") && w.body.link.pay?.fixedCents === 16000, "host makes a link through the site", w.body);
    const l1 = w.body.link;
    w = await call(WEB, "POST", `/api/events/${ev}/team/links`, { token: C, body: { scope: "standing", role: "media" } });
    let b = await call(BACKEND, "POST", `/api/events/${ev}/team/links`, { token: C, body: { scope: "standing", role: "media" } });
    assert(w.status === 403 && relayed(w, b), "the backend's refusal is relayed (co-host, All my events)", { w, b });
    w = await call(WEB, "POST", `/api/events/not-a-uuid/team/links`, { token: H, body: { scope: "event", role: "door" } });
    assert(w.status === 404, "bad event id: 404 here", w);
    w = await call(WEB, "POST", `/api/events/${ev}/team/links`, { token: H, raw: "[1,2]" });
    assert(w.status === 400 && w.body?.code === "INVALID_JSON", "a body that isn't an object: 400 here", w);
    w = await call(WEB, "POST", `/api/events/${ev}/team/links`, { body: { scope: "event", role: "door" } });
    assert(w.status === 401, "signed out: 401 relayed", w);

    console.log("list and cancel");
    const [wl, bl] = [await call(WEB, "GET", `/api/events/${ev}/team/links`, { token: H }), await call(BACKEND, "GET", `/api/events/${ev}/team/links`, { token: H })];
    assert(wl.status === 200 && JSON.stringify(wl.body) === JSON.stringify(bl.body) && wl.body.links.some((x: any) => x.id === l1.id), "open links, same as the backend", wl.body); // eslint-disable-line @typescript-eslint/no-explicit-any
    w = await call(WEB, "POST", `/api/events/${ev}/team/links`, { token: H, body: { scope: "event", role: "door" } });
    const l2 = w.body.link;
    w = await call(WEB, "DELETE", `/api/events/${ev}/team/links/not-a-uuid`, { token: H });
    assert(w.status === 404, "bad link id: 404 here", w);
    w = await call(WEB, "DELETE", `/api/events/${ev}/team/links/${l2.id}`, { token: H });
    assert(w.status === 200 && w.body?.link?.status === "cancelled", "cancel through the site", w.body);
    w = await call(WEB, "DELETE", `/api/events/${ev}/team/links/${l2.id}`, { token: H });
    b = await call(BACKEND, "DELETE", `/api/events/${ev}/team/links/${l2.id}`, { token: H });
    assert(w.status === 409 && relayed(w, b), "cancel twice: the backend's 409 relayed", { w, b });

    console.log("the link page (public)");
    const [wp, bp] = [await call(WEB, "GET", `/api/events/team-links/${l1.code}`), await call(BACKEND, "GET", `/api/events/team-links/${l1.code}`)];
    assert(wp.status === 200 && JSON.stringify(wp.body) === JSON.stringify(bp.body) && wp.body.link.status === "open", "signed out: the link page, same as the backend", wp.body);
    w = await call(WEB, "GET", `/api/events/team-links/${l1.code.toLowerCase()}`);
    assert(w.status === 200, "a lowercase code is cleaned here", w.status);
    w = await call(WEB, "GET", `/api/events/team-links/${encodeURIComponent("../../door/mine")}`);
    assert(w.status === 404 && w.body?.code === "NOT_FOUND", "anything that isn't a code never reaches the backend", w);
    w = await call(WEB, "GET", `/api/events/team-links/${l1.code}`, { token: H });
    assert(w.body?.link?.isHost === true, "signed in: the cookie goes along (the host is told)", w.body);

    console.log("accept");
    w = await call(WEB, "POST", `/api/events/team-links/${l1.code}/accept`);
    assert(w.status === 401, "signed out: 401 (the page opens quick sign up)", w);
    w = await call(WEB, "POST", `/api/events/team-links/OOOOOOOOOOOO/accept`, { token: A });
    assert(w.status === 404, "not a code: 404 here", w);
    w = await call(WEB, "POST", `/api/events/team-links/${l1.code}/accept`, { token: A });
    assert(w.status === 200 && w.body?.invite?.status === "accepted" && w.body.invite.role === "security", "Ana accepts through the site", w.body);
    w = await call(WEB, "POST", `/api/events/team-links/${l1.code}/accept`, { token: B });
    b = await call(BACKEND, "POST", `/api/events/team-links/${l1.code}/accept`, { token: B });
    assert(w.status === 409 && relayed(w, b) && w.body?.code === "LINK_CLOSED", "someone else: LINK_CLOSED relayed", { w, b });
    const pay = await q(`SELECT pay_type, fixed_cents FROM event_team_pay WHERE event_id = $1 AND member_user_id = $2 AND role = 'security'`, [ev, ana]);
    assert(pay[0]?.pay_type === "fixed" && pay[0].fixed_cents === 16000, "and the link's pay is theirs", pay);
  } finally {
    await q(`DELETE FROM event_team_links WHERE event_id = ANY($1)`, [events]).catch(() => {});
    await q(`DELETE FROM event_team_pay WHERE event_id = ANY($1)`, [events]).catch(() => {});
    await q(`DELETE FROM event_door_members WHERE event_id = ANY($1)`, [events]).catch(() => {});
    await q(`DELETE FROM events WHERE id = ANY($1)`, [events]).catch(() => {});
    await db.end();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
