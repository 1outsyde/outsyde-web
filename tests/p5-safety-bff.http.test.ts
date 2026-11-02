/**
 * p5-safety web BFF routes, end to end through this site to a local backend (Legend's calls W1 to W12, 2026-11-01).
 *
 *   GET  /api/admin/events/reports?type=event|post         Reports tab
 *   POST /api/admin/events/:id/pause|release|cancel        { reason }  (only the reason is forwarded)
 *   POST /api/admin/events/:id/reports/dismiss             { reason }
 *   POST /api/admin/events/hosts/:userId/trust             { trusted, note? }
 *   POST /api/admin/events/posts/:postId/action            { action: remove|dismiss, reason } → /api/admin/moderation/action
 *   POST /api/events/:id/report                            { reason, note? }
 *   GET  /api/events/slug/:slug                            on hold: holders and the host see onHold, others 404
 *
 * Run with: P5_WEB_URL=http://localhost:3101 P5_BACKEND_URL=http://localhost:5071 \
 *   P5_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde P5_BACKEND_DIR=/root/w/outsyde-backend npx tsx tests/p5-safety-bff.http.test.ts
 * LOCAL ONLY (refuses non localhost). Backend JWT secret "test". Skips (exit 0) when the web server is not reachable.
 * Seeds the admin info@goutsyde.com (refuses if it exists), a host, guests, an event and a post, and removes them after.
 */
import { createRequire } from "module";

const WEB = process.env.P5_WEB_URL || "http://localhost:3101";
const BACKEND = process.env.P5_BACKEND_URL || "http://localhost:5071";
const PG_URL = process.env.P5_PG_URL || "postgresql://outsyde:outsyde@localhost:5432/outsyde_test";
const BACKEND_DIR = (process.env.P5_BACKEND_DIR || "/home/claude/outsyde-backend").replace(/\/+$/, "");
const ADMIN_EMAIL = "info@goutsyde.com";

let passed = 0, failed = 0;
function assert(cond: boolean, name: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.error(`  FAIL ${name}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 600)); }
}
const isLocal = (u: string) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(u).hostname);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Res = { status: number; body: any };
async function call(base: string, method: string, path: string, o: { token?: string; body?: unknown } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  if (o.token) { if (base === BACKEND) headers.Authorization = `Bearer ${o.token}`; else headers.Cookie = `outsyde_access_token=${o.token}`; }
  if (o.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(new URL(path, base), { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

(async () => {
  for (const u of [WEB, BACKEND, PG_URL]) if (!isLocal(u)) throw new Error("refusing to run: P5_WEB_URL, P5_BACKEND_URL and P5_PG_URL must be localhost");
  try { await fetch(new URL("/", WEB), { method: "HEAD" }); } catch { console.log(`skipped: web server not reachable at ${WEB}`); process.exit(0); }

  const req = createRequire(`${BACKEND_DIR}/package.json`);
  const pg = req("pg");
  const jwt = req("jsonwebtoken");
  const db = new pg.Client({ connectionString: PG_URL });
  await db.connect();
  const q = async (t: string, p: unknown[] = []) => (await db.query(t, p)).rows as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  if ((await q(`SELECT 1 FROM users WHERE lower(email) = $1`, [ADMIN_EMAIL])).length) { await db.end(); throw new Error(`refusing to run: ${ADMIN_EMAIL} already exists`); }

  const P = `p5${Date.now().toString(36)}`;
  const users: string[] = [];
  const events: string[] = [];
  const posts: string[] = [];
  const mkUser = async (s: string, admin = false) => {
    const id = (await q(`INSERT INTO users (id, username, email, first_name, is_active, is_admin) VALUES (gen_random_uuid(), $1, $2, $3, true, $4) RETURNING id`,
      [`${P}${s}`.slice(0, 20), admin ? ADMIN_EMAIL : `${P}-${s}@test.local`, `F${s}`, admin]))[0].id as string;
    users.push(id);
    return { id, token: jwt.sign({ userId: id, isVendor: false, isAdmin: admin }, "test", { expiresIn: "1h" }) as string };
  };
  const mkEvent = async (hostId: string, s: string, status = "published") => {
    const e = (await q(`INSERT INTO events (host_user_id, host_type, slug, title, status, starts_at, ends_at, timezone, published_at)
      VALUES ($1, 'user', $2, $3, $4, now() + interval '10 days', now() + interval '10 days 4 hours', 'America/New_York', now() - interval '1 day') RETURNING id, slug`,
      [hostId, `${P}-${s}`, `${P} ${s}`, status]))[0] as { id: string; slug: string };
    events.push(e.id);
    return e;
  };

  try {
    const admin = await mkUser("adm", true);
    const host = await mkUser("host");
    const guest = await mkUser("guest");
    const holder = await mkUser("holder");
    const ev = await mkEvent(host.id, "party");
    const typeId = (await q(`INSERT INTO ticket_types (event_id, name, price_cents, quantity, min_per_order, max_per_order) VALUES ($1, 'RSVP', 0, 50, 1, 2) RETURNING id`, [ev.id]))[0].id;
    const oid = (await q(`INSERT INTO ticket_orders (event_id, buyer_user_id, status, ticket_count, subtotal_cents, platform_fee_cents, host_net_cents, total_cents, completed_at)
      VALUES ($1, $2, 'completed', 1, 0, 0, 0, 0, now()) RETURNING id`, [ev.id, holder.id]))[0].id;
    const iid = (await q(`INSERT INTO ticket_order_items (order_id, event_id, ticket_type_id, buyer_user_id, quantity, unit_price_cents, status, expires_at)
      VALUES ($1, $2, $3, $4, 1, 0, 'issued', now() + interval '1 day') RETURNING id`, [oid, ev.id, typeId, holder.id]))[0].id;
    await q(`INSERT INTO tickets (order_id, order_item_id, event_id, ticket_type_id, holder_user_id, item_index, code, status, price_cents, service_fee_cents, per_ticket_fee_cents, platform_fee_cents, host_net_cents)
      VALUES ($1, $2, $3, $4, $5, 1, $6, 'valid', 0, 0, 0, 0, 0)`,
      [oid, iid, ev.id, typeId, holder.id, `${P}CODE`.toUpperCase()]);
    const ZERO = "00000000-0000-0000-0000-000000000000";

    console.log("Report this event (W8, W9)");
    let r = await call(WEB, "POST", `/api/events/${ev.id}/report`, { body: { reason: "scam" } });
    assert(r.status === 401, "signed out: 401", r);
    r = await call(WEB, "POST", `/api/events/not-a-uuid/report`, { token: guest.token, body: { reason: "scam" } });
    assert(r.status === 404, "bad id: 404 without the backend", r);
    r = await call(WEB, "POST", `/api/events/${ev.id}/report`, { token: guest.token, body: { reason: "spam" } });
    assert(r.status === 400 && r.body?.code === "INVALID_INPUT", "unknown reason: 400 in the BFF", r);
    r = await call(WEB, "POST", `/api/events/${ev.id}/report`, { token: guest.token, body: { reason: "scam", note: "x".repeat(501) } });
    assert(r.status === 400, "note over 500: 400", r);
    r = await call(WEB, "POST", `/api/events/${ev.id}/report`, { token: guest.token, body: { reason: "other" } });
    assert(r.status === 400 && typeof r.body?.error === "string", "something else without a note: backend 400 relayed", r);
    r = await call(WEB, "POST", `/api/events/${ev.id}/report`, { token: host.token, body: { reason: "scam" } });
    assert(r.status === 403 && r.body?.code === "CANT_REPORT_OWN" && /can't report an event you host/.test(r.body?.error ?? ""), "host: 403 with the backend line", r);
    r = await call(WEB, "POST", `/api/events/${ev.id}/report`, { token: guest.token, body: { reason: "other", note: "  Flyer looks fake  ", extra: "dropped" } });
    assert(r.status === 200 && r.body?.success === true && r.body?.alreadyReported === false, "guest reports with a note (extra keys dropped, backend is strict)", r);
    const row = (await q(`SELECT reason, details FROM moderation_queue WHERE target_type = 'event' AND target_id = $1 AND reporter_id = $2`, [ev.id, guest.id]))[0];
    assert(row?.reason === "other" && row?.details === "Flyer looks fake", "saved with the trimmed note", row);

    console.log("\nReports tab (W1, W2)");
    r = await call(WEB, "GET", "/api/admin/events/reports?type=event");
    assert(r.status === 401, "signed out: 401", r);
    r = await call(WEB, "GET", "/api/admin/events/reports?type=event", { token: guest.token });
    assert(r.status === 403, "non admin: 403", r);
    r = await call(WEB, "GET", "/api/admin/events/reports?type=garbage", { token: admin.token });
    const item = (r.body?.items ?? []).find((i: { eventId: string }) => i.eventId === ev.id);
    assert(r.status === 200 && r.body?.type === "event" && item?.reportCount === 1 && item?.reasons?.[0]?.note === "Flyer looks fake", "unknown type falls back to events; the report is listed", r.body);

    console.log("\nPause, on hold page (W2, W10)");
    r = await call(WEB, "POST", `/api/admin/events/${ev.id}/pause`, { body: { reason: "x" } });
    assert(r.status === 401, "signed out: 401", r);
    r = await call(WEB, "POST", `/api/admin/events/${ev.id}/pause`, { token: admin.token, body: { reason: "   " } });
    assert(r.status === 400 && r.body?.code === "INVALID_BODY", "blank reason: 400 in the BFF", r);
    r = await call(WEB, "POST", `/api/admin/events/${ev.id}/pause`, { token: admin.token, body: { reason: "x".repeat(501) } });
    assert(r.status === 400, "reason over 500: 400", r);
    for (const bad of ["a_b", "a.b", "x".repeat(65)]) {
      r = await call(WEB, "POST", `/api/admin/events/${bad}/pause`, { token: admin.token, body: { reason: "x" } });
      assert(r.status === 404, `bad id ${bad.slice(0, 6)}: 404`, r);
    }
    r = await call(WEB, "POST", `/api/admin/events/${ev.id}/pause`, { token: guest.token, body: { reason: "x" } });
    assert(r.status === 403, "non admin: 403", r);
    r = await call(WEB, "POST", `/api/admin/events/${ev.id}/pause`, { token: admin.token, body: { reason: " Several reports of a fake flyer ", status: "cancelled" } });
    assert(r.status === 200 && r.body?.status === "paused", "admin pauses (extra keys dropped, backend is strict)", r);
    r = await call(WEB, "POST", `/api/admin/events/${ev.id}/pause`, { token: admin.token, body: { reason: "again" } });
    assert(r.status === 409 && r.body?.code === "NOT_PUBLISHED", "pause again: 409 relayed with its code", r);
    r = await call(WEB, "GET", `/api/events/slug/${ev.slug}`, { token: guest.token });
    assert(r.status === 404, "on hold: a guest without a ticket gets 404", r.status);
    r = await call(WEB, "GET", `/api/events/slug/${ev.slug}`);
    assert(r.status === 404, "on hold: signed out gets 404", r.status);
    r = await call(WEB, "GET", `/api/events/slug/${ev.slug}`, { token: holder.token });
    assert(r.status === 200 && r.body?.event?.onHold === true && r.body?.event?.status === "paused" && r.body?.ticketTypes?.every((t: { salesStatus: string }) => t.salesStatus === "ended"), "holder sees it on hold, nothing on sale", r.body?.event);
    r = await call(WEB, "GET", `/api/events/slug/${ev.slug}`, { token: host.token });
    assert(r.status === 200 && r.body?.event?.onHold === true && r.body?.event?.viewerIsHost === true, "host sees it on hold", r.body?.event);
    r = await call(WEB, "POST", `/api/events/${ev.id}/report`, { token: holder.token, body: { reason: "wrong_details" } });
    assert(r.status === 200, "a holder can still report it while on hold", r);
    const st = (await q(`SELECT status FROM moderation_queue WHERE target_type = 'event' AND target_id = $1 AND reporter_id = $2`, [ev.id, guest.id]))[0];
    assert(st?.status === "reviewed", "pause closed the earlier report", st);

    console.log("\nEvent detail: Safety box data and activity (W3, W6)");
    r = await call(WEB, "GET", `/api/admin/events/${ev.id}`, { token: admin.token });
    const acts = (r.body?.activity ?? []).map((a: { text: string }) => a.text);
    assert(r.status === 200 && r.body?.moderation?.pendingReports === 1 && r.body?.moderation?.hostType === "user" && r.body?.moderation?.hostLimited === true, "moderation summary passes through", r.body?.moderation);
    assert(acts.some((t: string) => /^Event put on hold( by @\S+)?\. Reason: Several reports of a fake flyer\.$/.test(t)), "activity shows the pause with the trimmed reason (backend W6)", acts);

    console.log("\nDismiss, release, trust (W2, W4)");
    r = await call(WEB, "POST", `/api/admin/events/${ev.id}/reports/dismiss`, { token: admin.token, body: { reason: "Details are right" } });
    assert(r.status === 200 && r.body?.dismissed === 1, "dismiss: 1 report closed", r);
    r = await call(WEB, "POST", `/api/admin/events/${ev.id}/release`, { token: admin.token, body: { reason: "Venue confirmed" } });
    assert(r.status === 200 && r.body?.status === "published", "release: live again", r);
    r = await call(WEB, "GET", `/api/events/slug/${ev.slug}`, { token: guest.token });
    assert(r.status === 200 && r.body?.event?.onHold === false, "released: public again, onHold false", r.body?.event?.onHold);
    r = await call(WEB, "POST", `/api/admin/events/hosts/${host.id}/trust`, { token: admin.token, body: { trusted: "yes" } });
    assert(r.status === 400 && r.body?.code === "INVALID_BODY", "trusted not a boolean: 400", r);
    r = await call(WEB, "POST", `/api/admin/events/hosts/${host.id}/trust`, { token: admin.token, body: { trusted: true, note: "x".repeat(501) } });
    assert(r.status === 400, "note over 500: 400", r);
    r = await call(WEB, "POST", `/api/admin/events/hosts/a.b/trust`, { token: admin.token, body: { trusted: true } });
    assert(r.status === 404, "bad host id: 404", r);
    r = await call(WEB, "POST", `/api/admin/events/hosts/${host.id}/trust`, { token: admin.token, body: { trusted: true, note: " Known promoter " } });
    let det = await call(WEB, "GET", `/api/admin/events/${ev.id}`, { token: admin.token });
    assert(r.status === 200 && r.body?.trusted === true && det.body?.moderation?.hostTrusted === true && det.body?.moderation?.hostLimited === false, "trusted on", { r: r.body, m: det.body?.moderation });
    assert((det.body?.activity ?? []).some((a: { text: string }) => /Note: Known promoter\.$/.test(a.text)), "trust note trimmed and shown in activity", det.body?.activity);
    r = await call(WEB, "POST", `/api/admin/events/hosts/${host.id}/trust`, { token: admin.token, body: { trusted: false } });
    det = await call(WEB, "GET", `/api/admin/events/${ev.id}`, { token: admin.token });
    assert(r.status === 200 && det.body?.moderation?.hostTrusted === false, "trusted off", det.body?.moderation);

    console.log("\nPost reports (W5)");
    const post = (await q(`INSERT INTO feed_posts (author_id, author_type, post_type, post_intent, content, is_active) VALUES ($1, 'user', 'photo', 'share', 'p5 post', true) RETURNING id`, [host.id]))[0].id as string;
    const post2 = (await q(`INSERT INTO feed_posts (author_id, author_type, post_type, post_intent, content, is_active) VALUES ($1, 'user', 'photo', 'share', 'p5 post two', true) RETURNING id`, [host.id]))[0].id as string;
    posts.push(post, post2);
    for (const p of [post, post2]) await call(BACKEND, "POST", `/api/feed/${p}/report`, { token: guest.token, body: { reason: "Spam" } });
    r = await call(WEB, "GET", "/api/admin/events/reports?type=post", { token: admin.token });
    assert(r.status === 200 && r.body?.type === "post" && (r.body?.items ?? []).filter((i: { postId: string }) => i.postId === post || i.postId === post2).length === 2, "both posts listed", r.body);
    r = await call(WEB, "POST", `/api/admin/events/posts/${post}/action`, { token: admin.token, body: { action: "ban", reason: "x" } });
    assert(r.status === 400 && r.body?.code === "INVALID_BODY", "only remove or dismiss (never ban)", r);
    r = await call(WEB, "POST", `/api/admin/events/posts/${post}/action`, { token: admin.token, body: { action: "remove" } });
    assert(r.status === 400, "reason required", r);
    r = await call(WEB, "POST", `/api/admin/events/posts/${post}/action`, { body: { action: "remove", reason: "x" } });
    assert(r.status === 401, "signed out: 401", r);
    r = await call(WEB, "POST", `/api/admin/events/posts/${post}/action`, { token: guest.token, body: { action: "remove", reason: "x" } });
    assert(r.status === 403, "non admin: 403", r);
    r = await call(WEB, "POST", `/api/admin/events/posts/${post}/action`, { token: admin.token, body: { action: "remove", reason: "Spam account" } });
    const pr = (await q(`SELECT is_active FROM feed_posts WHERE id = $1`, [post]))[0];
    const mq = (await q(`SELECT status, admin_action, admin_notes, reviewed_by FROM moderation_queue WHERE target_type = 'post' AND target_id = $1`, [post]))[0];
    assert(r.status === 200 && pr?.is_active === false && mq?.status === "reviewed" && mq?.admin_action === "remove" && mq?.admin_notes === "Spam account" && mq?.reviewed_by === admin.id,
      "remove: post hidden, report closed with the reason and the admin", { r: r.body, pr, mq });
    r = await call(WEB, "POST", `/api/admin/events/posts/${post2}/action`, { token: admin.token, body: { action: "dismiss", reason: "Fine" } });
    const p2 = (await q(`SELECT is_active FROM feed_posts WHERE id = $1`, [post2]))[0];
    r = await call(WEB, "GET", "/api/admin/events/reports?type=post", { token: admin.token });
    assert(p2?.is_active === true && !(r.body?.items ?? []).some((i: { postId: string }) => i.postId === post || i.postId === post2), "dismiss: post stays up; both gone from the list", r.body);

    console.log("\nCancel and refund everyone (W2)");
    r = await call(WEB, "POST", `/api/admin/events/${ZERO}/cancel`, { token: admin.token, body: { reason: "x" } });
    assert(r.status === 404 && r.body?.code === "EVENT_NOT_FOUND", "unknown event: 404 relayed", r);
    r = await call(WEB, "POST", `/api/admin/events/${ev.id}/cancel`, { token: admin.token, body: { reason: "Scam confirmed" } });
    assert(r.status === 200 && r.body?.status === "cancelled", "cancel: cancelled", r);
    await new Promise((res) => setTimeout(res, 300));
    const ord = (await q(`SELECT status FROM ticket_orders WHERE id = $1`, [oid]))[0];
    assert(ord?.status === "cancelled", "the free RSVP is cancelled", ord);
    r = await call(WEB, "POST", `/api/events/${ev.id}/report`, { token: guest.token, body: { reason: "scam" } });
    assert(r.status === 404, "cancelled: can't be reported", r);
  } finally {
    await q(`DELETE FROM moderation_queue WHERE target_id = ANY($1::varchar[]) OR reporter_id = ANY($2::varchar[])`, [[...events, ...posts], users]).catch(() => {});
    await q(`DELETE FROM audit_logs WHERE target_id = ANY($1::varchar[]) OR actor_id = ANY($1::varchar[])`, [[...events, ...users]]).catch(() => {});
    await q(`DELETE FROM event_host_trust WHERE user_id = ANY($1::varchar[])`, [users]).catch(() => {});
    await q(`DELETE FROM feed_posts WHERE id = ANY($1::varchar[])`, [posts]).catch(() => {});
    for (const t of ["tickets", "ticket_order_items", "ticket_orders", "ticket_types"]) await q(`DELETE FROM ${t} WHERE event_id = ANY($1::varchar[])`, [events]).catch(() => {});
    await q(`DELETE FROM notifications WHERE user_id = ANY($1::varchar[])`, [users]).catch(() => {});
    await q(`DELETE FROM events WHERE id = ANY($1::varchar[])`, [events]).catch(() => {});
    await q(`DELETE FROM users WHERE id = ANY($1::varchar[])`, [users]).catch((e: Error) => console.error("cleanup users:", e.message));
    await db.end();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
