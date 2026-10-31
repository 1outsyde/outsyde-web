/**
 * Event team BFF routes (p4-team step 8) HTTP tests: every new pass through, its own checks (ids, role, reason,
 * answers) and that it relays the backend's answer unchanged.
 *
 * LOCAL ONLY. Same setup as events-bff.http.test.ts: this site running with OUTSYDE_BACKEND_URL pointing at a
 * localhost outsyde-backend (JWT secret "test") on a scratch Postgres with migrations up to 091.
 *   EV_WEB_URL, EV_BACKEND_URL, EV_PG_URL (all localhost), EV_BACKEND_DIR (for pg and jsonwebtoken).
 * Run: npx tsx tests/events-team-bff.http.test.ts (skips when EV_WEB_URL is unset).
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
  const P = `tb${Date.now().toString(36)}`;
  const users: string[] = [], events: string[] = [];
  const user = async (s: string) => {
    const id = (await q(`INSERT INTO users (id, email, name, first_name, username, is_active) VALUES (gen_random_uuid(), $1, $2, $3, $4, true) RETURNING id`,
      [`${P}-${s}@test.local`, `Person ${s}`, `First${s}`, `${P}${s}`.slice(0, 24)]))[0].id as string;
    users.push(id); return id;
  };
  const ZERO = "00000000-0000-4000-8000-000000000000";

  try {
    const host = await user("host"), sec = await user("sec"), co = await user("co"), stranger = await user("x");
    const ev = (await q(`INSERT INTO events (host_user_id, slug, title, status, starts_at, ends_at, timezone, published_at)
      VALUES ($1, $2, $3, 'published', now() - interval '1 hour', now() + interval '4 hours', 'America/New_York', now() - interval '5 days') RETURNING id`,
      [host, `${P}-night`, `${P} night`]))[0].id as string;
    events.push(ev);
    const add = (u: string, role: string) => q(`INSERT INTO event_door_members (event_id, member_user_id, added_by_user_id, role, cohost_level, invited_at, accepted_at)
      VALUES ($1, $2, $3, $4, $5, now() - interval '3 days', now() - interval '2 days')`, [ev, u, host, role, role === "cohost" ? "team" : null]);
    await add(sec, "security"); await add(co, "cohost");
    const H = tok(host), S = tok(sec), C = tok(co), X = tok(stranger);
    const both = async (method: string, path: string, token: string, body?: unknown) =>
      [await call(WEB, method, path, { token, body }), await call(BACKEND, method, path, { token, body })] as const;

    console.log("lists with ?roles=all");
    let [w, b] = await both("GET", `/api/events/${ev}/door/team?roles=all`, H);
    assert(w.status === 200 && JSON.stringify(w.body) === JSON.stringify(b.body) && w.body.event.some((m: any) => m.role === "security"), "team list, every role, same as the backend", w.body); // eslint-disable-line @typescript-eslint/no-explicit-any
    w = await call(WEB, "GET", `/api/events/${ev}/door/team?roles=security`, { token: H });
    assert(w.status === 200 && !w.body.event.some((m: any) => m.role === "security"), "any other ?roles= is dropped (Admissions only, the old default)", w.body); // eslint-disable-line @typescript-eslint/no-explicit-any
    [w, b] = await both("GET", "/api/events/door/mine?roles=all", S);
    assert(w.status === 200 && JSON.stringify(w.body) === JSON.stringify(b.body) && w.body.events.some((e: any) => e.id === ev && e.team?.[0]?.role === "security"), "my team events", w.body); // eslint-disable-line @typescript-eslint/no-explicit-any
    [w, b] = await both("GET", "/api/events/door/invites?roles=all", S);
    assert(w.status === 200 && JSON.stringify(w.body) === JSON.stringify(b.body), "invites, every role", w.body);
    [w, b] = await both("GET", "/api/events/cohosting", C);
    assert(w.status === 200 && JSON.stringify(w.body) === JSON.stringify(b.body) && w.body.events.some((e: any) => e.id === ev), "events I co-host", w.body); // eslint-disable-line @typescript-eslint/no-explicit-any

    console.log("invites for every role: view, accept, leave (review C1)");
    const inv = (await q(`INSERT INTO event_door_members (event_id, member_user_id, added_by_user_id, role, invited_at) VALUES ($1, $2, $3, 'media', now()) RETURNING id`, [ev, stranger, host]))[0].id as string;
    w = await call(WEB, "GET", `/api/events/door/invites/${inv}`, { token: X });
    assert(w.status === 404, "without ?roles=all a Media invite stays hidden (old app builds)", w);
    w = await call(WEB, "GET", `/api/events/door/invites/${inv}?roles=all`, { token: X });
    assert(w.status === 200 && w.body?.invite?.role === "media", "with ?roles=all: the invite", w);
    w = await call(WEB, "POST", `/api/events/door/invites/${inv}/accept?roles=all`, { token: X });
    assert(w.status === 200 && w.body?.invite?.status === "accepted", "accept a Media invite through the site", w);
    w = await call(WEB, "POST", `/api/events/door/invites/${inv}/leave?roles=all`, { token: X });
    assert(w.status === 200, "leave it through the site", w);
    const inv2 = (await q(`INSERT INTO event_door_members (event_id, member_user_id, added_by_user_id, role, role_label, invited_at) VALUES ($1, $2, $3, 'other', 'Coat check', now()) RETURNING id`, [ev, stranger, host]))[0].id as string;
    w = await call(WEB, "POST", `/api/events/door/invites/${inv2}/decline?roles=all`, { token: X });
    assert(w.status === 200, "decline an Other invite through the site", w);

    console.log("times, pay, co-host level");
    const sched = { callAt: new Date(Date.now() + 30 * 60e3).toISOString(), startsAt: null, endsAt: new Date(Date.now() + 3 * 3600e3).toISOString(), loadInAt: null, placeNote: "Side door", hostNote: null };
    w = await call(WEB, "PUT", `/api/events/${ev}/door/team/${sec}/schedule`, { token: H, body: sched });
    assert(w.status === 400 && w.body?.code === "INVALID_REQUEST", "times without ?role= : 400 here", w);
    w = await call(WEB, "PUT", `/api/events/${ev}/door/team/${sec}/schedule?role=dj`, { token: H, body: sched });
    assert(w.status === 400, "unknown role: 400 here", w);
    w = await call(WEB, "PUT", `/api/events/not-a-uuid/door/team/${sec}/schedule?role=security`, { token: H, body: sched });
    assert(w.status === 404, "bad id: 404 here", w);
    w = await call(WEB, "PUT", `/api/events/${ev}/door/team/${sec}/schedule?role=security`, { body: sched });
    assert(w.status === 401, "signed out: 401", w);
    w = await call(WEB, "PUT", `/api/events/${ev}/door/team/${sec}/schedule?role=security`, { token: H, raw: "[1]" });
    assert(w.status === 400 && w.body?.code === "INVALID_JSON", "array body: 400 here", w);
    w = await call(WEB, "PUT", `/api/events/${ev}/door/team/${sec}/schedule?role=security`, { token: C, body: sched });
    assert(w.status === 200 && w.body?.schedule?.placeNote === "Side door", "a co-host sets times (PUT goes through)", w);
    w = await call(WEB, "PUT", `/api/events/${ev}/door/team/${sec}/pay?role=security`, { token: C, body: { payType: "fixed", fixedCents: 16000 } });
    b = await call(BACKEND, "PUT", `/api/events/${ev}/door/team/${sec}/pay?role=security`, { token: C, body: { payType: "fixed", fixedCents: 16000 } });
    assert(w.status === 403 && relayed(w, b), "a co-host can't set pay: backend 403 relayed", w);
    w = await call(WEB, "PUT", `/api/events/${ev}/door/team/${sec}/pay?role=security`, { token: H, body: { payType: "fixed", fixedCents: 16000 } });
    assert(w.status === 200 && w.body?.pay?.earnedCents === 16000, "host sets $160", w);
    w = await call(WEB, "PUT", `/api/events/${ev}/door/team/${co}/cohost-level`, { token: H, body: { scope: "event", level: "edit" } });
    assert(w.status === 200 && w.body?.cohostLevel === "edit", "co-host level", w);

    console.log("stay longer");
    w = await call(WEB, "POST", `/api/events/${ev}/door/team/${sec}/stay-longer?role=security`, { token: C, body: { minutes: 60, pay: "none" } });
    assert(w.status === 404, "a co-host can't ask: backend 404 relayed", w);
    w = await call(WEB, "POST", `/api/events/${ev}/door/team/${sec}/stay-longer?role=security`, { token: H, body: { minutes: 60, pay: "fixed", fixedCents: 5000 } });
    assert(w.status === 201 && w.body?.request?.status === "open", "host asks: 201 relayed", w);
    const rid = w.body?.request?.id as string;
    [w, b] = await both("GET", `/api/events/${ev}/team/stay-longer`, C);
    assert(w.status === 200 && JSON.stringify(w.body) === JSON.stringify(b.body) && w.body.requests[0]?.id === rid, "the list, co-host", w.body);
    [w, b] = await both("GET", `/api/events/${ev}/team/me`, S);
    assert(w.status === 200 && JSON.stringify(w.body) === JSON.stringify(b.body) && w.body.stayLonger?.[0]?.id === rid, "their own page, same as the backend", w.body);
    w = await call(WEB, "POST", `/api/events/${ev}/team/me/stay-longer/${rid}/maybe`, { token: S });
    assert(w.status === 404, "unknown answer: 404 here", w);
    w = await call(WEB, "POST", `/api/events/${ev}/team/me/stay-longer/${rid}/accept`, { token: X });
    assert(w.status === 404, "someone else can't answer: backend 404 relayed", w);
    w = await call(WEB, "POST", `/api/events/${ev}/team/me/stay-longer/${rid}/accept`, { token: S });
    assert(w.status === 200 && w.body?.request?.status === "accepted", "accept", w);
    w = await call(WEB, "PUT", `/api/events/${ev}/team/stay-longer/${rid}/amount`, { token: H, body: { cents: 100 } });
    assert(w.status === 409 && w.body?.code === "NOT_TBD", "amount on a Fixed request: backend 409 relayed", w);
    w = await call(WEB, "PUT", `/api/events/${ev}/team/stay-longer/${ZERO}/amount`, { token: H, body: { cents: 100 } });
    assert(w.status === 404, "unknown request: backend 404 relayed", w);

    console.log("taking someone off: role and reason go along");
    w = await call(WEB, "DELETE", `/api/events/${ev}/door/team/${sec}?scope=event&role=security&reason=sleepy`, { token: H });
    assert(w.status === 400 && w.body?.code === "INVALID_REQUEST", "unknown reason: 400 here", w);
    w = await call(WEB, "DELETE", `/api/events/${ev}/door/team/${sec}?scope=event&role=security&reason=other&note=${"x".repeat(201)}`, { token: H });
    assert(w.status === 400, "note over 200: 400 here", w);
    w = await call(WEB, "DELETE", `/api/events/${ev}/door/team/${sec}?scope=event&role=bouncer`, { token: H });
    assert(w.status === 400, "unknown role: 400 here", w);
    w = await call(WEB, "DELETE", `/api/events/${ev}/door/team/${sec}?scope=event&role=security`, { token: H });
    assert(w.status === 400 && w.body?.code === "REASON_REQUIRED", "a paid spot needs a reason: backend 400 relayed (role reached it)", w);

    console.log("messages");
    w = await call(WEB, "POST", `/api/events/${ev}/team/messages`, { token: H, body: { to: "role", role: "security", text: "Radio check at 9:15." } });
    assert(w.status === 201 && w.body?.success === true, "send to a role", w);
    [w, b] = await both("GET", `/api/events/${ev}/team/messages`, H);
    assert(w.status === 200 && JSON.stringify(w.body) === JSON.stringify(b.body) && w.body.messages.length === 1, "sent list", w.body);
    w = await call(WEB, "POST", `/api/events/${ev}/team/messages`, { token: S, body: { to: "team", text: "hi" } });
    assert(w.status === 404, "a member can't send: backend 404 relayed", w);

    w = await call(WEB, "DELETE", `/api/events/${ev}/door/team/${sec}?scope=event&role=security&reason=other&note=Left%20early`, { token: H });
    assert(w.status === 200 && w.body?.removed === true, "with a reason and note: taken off", w);
    const why = (await q(`SELECT removal_reason, removal_note FROM event_door_members WHERE event_id = $1 AND member_user_id = $2 AND role = 'security'`, [ev, sec]))[0];
    assert(why?.removal_reason === "other" && why?.removal_note === "Left early", "reason and note saved", why);

    console.log("team pay after the event");
    [w, b] = await both("GET", `/api/events/${ev}/team-payouts`, H);
    assert(w.status === 200 && JSON.stringify(w.body) === JSON.stringify(b.body), "team payouts (none yet)", w.body);
    w = await call(WEB, "POST", `/api/events/${ev}/team-payouts/${sec}/paid`, { token: H });
    assert(w.status === 404, "I paid them with no payout: backend 404 relayed", w);
    w = await call(WEB, "DELETE", `/api/events/${ev}/team-payouts/not-a-uuid/paid`, { token: H });
    assert(w.status === 404, "bad id: 404 here", w);
    w = await call(WEB, "POST", `/api/events/${ev}/team/me/payout/sure`, { token: S });
    assert(w.status === 404, "unknown answer: 404 here", w);
    w = await call(WEB, "POST", `/api/events/${ev}/team/me/payout/got-it`, { token: S });
    b = await call(BACKEND, "POST", `/api/events/${ev}/team/me/payout/got-it`, { token: S });
    assert(w.status >= 400 && relayed(w, b), "Got it with nothing marked: backend answer relayed", w);
  } catch (err) {
    failed++; console.error("  FAIL crashed:", err);
  } finally {
    for (const [t, a] of [
      [`DELETE FROM event_team_extensions WHERE event_id = ANY($1)`, [events]], [`DELETE FROM event_team_message_recipients WHERE team_message_id IN (SELECT id FROM event_team_messages WHERE event_id = ANY($1))`, [events]], [`DELETE FROM event_team_messages WHERE event_id = ANY($1)`, [events]],
      [`DELETE FROM event_team_message_senders WHERE event_id = ANY($1)`, [events]],
      [`DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE participant1_id = ANY($1) OR participant2_id = ANY($1))`, [users]],
      [`DELETE FROM conversations WHERE participant1_id = ANY($1) OR participant2_id = ANY($1)`, [users]],
      [`DELETE FROM event_team_schedules WHERE event_id = ANY($1)`, [events]], [`DELETE FROM event_team_pay WHERE event_id = ANY($1)`, [events]],
      [`DELETE FROM event_team_setup_notices WHERE event_id = ANY($1)`, [events]], [`DELETE FROM event_door_members WHERE event_id = ANY($1)`, [events]],
      [`DELETE FROM notifications WHERE user_id = ANY($1)`, [users]], [`DELETE FROM events WHERE id = ANY($1)`, [events]], [`DELETE FROM users WHERE id = ANY($1)`, [users]],
    ] as const) await q(t, a as unknown as unknown[]).catch((e: Error) => console.error("cleanup:", e.message));
    await db.end();
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  }
})();
