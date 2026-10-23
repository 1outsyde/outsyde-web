/**
 * Discover BFF routes (/api/discover/...) HTTP tests.
 *
 * Run with: npx tsx tests/discover-bff.http.test.ts
 *
 * LOCAL ONLY. Needs this site running with OUTSYDE_BACKEND_URL pointing at a localhost outsyde-backend on a scratch
 * Postgres (JWT secret "test", session secret "localsessionsecret"). Environment variables:
 *   DS_WEB_URL      e.g. http://localhost:3101   (must be localhost)
 *   DS_BACKEND_URL  e.g. http://localhost:5071   (must be localhost)
 *   DS_PG_URL       the backend's scratch database (localhost only; seeds rows, cleans up)
 *   DS_BACKEND_DIR  path to an outsyde-backend checkout; `pg`, `jsonwebtoken` and `cookie-signature` load from it
 * Skips (exit 0) when DS_WEB_URL is unset. Auth is minted (see discoverAuth.ts), never through /api/login.
 */
import { backendRequire, mintToken, mintSessionCookie } from "./discoverAuth";

const WEB = process.env.DS_WEB_URL;
const BACKEND = process.env.DS_BACKEND_URL;
const PG_URL = process.env.DS_PG_URL;

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.error(`  FAIL ${name}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 500)); }
}
const isLocal = (u: string) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(u).hostname);

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type Res = { status: number; body: Json };
async function call(method: string, path: string, opts: { token?: string; cookie?: string; body?: unknown; raw?: string } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  const cookies: string[] = [];
  if (opts.token) cookies.push(`outsyde_access_token=${opts.token}`);
  if (opts.cookie) cookies.push(opts.cookie);
  if (cookies.length) headers.Cookie = cookies.join("; ");
  let body: string | undefined;
  if (opts.raw !== undefined) { body = opts.raw; headers["Content-Type"] = "application/json"; }
  else if (opts.body !== undefined) { body = JSON.stringify(opts.body); headers["Content-Type"] = "application/json"; }
  const res = await fetch(new URL(path, WEB), { method, headers, body });
  return { status: res.status, body: await res.json().catch(() => null) };
}

(async () => {
  if (!WEB) { console.log("skipped: set DS_WEB_URL, DS_BACKEND_URL, DS_PG_URL, DS_BACKEND_DIR to run"); process.exit(0); }
  if (!BACKEND || !PG_URL || !isLocal(WEB) || !isLocal(BACKEND) || !isLocal(PG_URL)) throw new Error("refusing to run: DS_WEB_URL, DS_BACKEND_URL and DS_PG_URL must all be localhost");
  const dir = process.env.DS_BACKEND_DIR;
  if (!dir) throw new Error("set DS_BACKEND_DIR to an outsyde-backend checkout (for pg, jsonwebtoken, cookie-signature)");
  const pg = backendRequire(dir)("pg");
  const db = new pg.Client({ connectionString: PG_URL });
  await db.connect();
  const q = async (t: string, p: unknown[] = []) => (await db.query(t, p)).rows as Json[];

  const P = `ds${Date.now().toString(36)}`;
  const userIds: string[] = [];
  const sids: string[] = [];
  const postIds: string[] = [];
  const storyIds: string[] = [];
  const mkUser = async (s: string) => {
    const id = (await q(
      `INSERT INTO users (id, email, name, username) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id`,
      [`${P}-${s}@test.local`, `Disc ${s}`, `${P}${s}`.slice(0, 20)],
    ))[0].id as string;
    userIds.push(id);
    return id;
  };

  try {
    const author = await mkUser("author");
    const viewer = await mkUser("viewer");
    const viewerTok = mintToken(dir, viewer);
    const { cookie, sid } = await mintSessionCookie(dir, db, viewer);
    sids.push(sid);

    // The viewer's own post always leads their feed, so the isLiked check does not depend on feed ranking.
    const imgPost = (await q(
      `INSERT INTO feed_posts (author_id, author_type, post_type, content, media_type, media_url, image_url, feed_surface)
       VALUES ($1, 'user', 'image', $2, 'image', 'https://example.com/a.jpg', 'https://example.com/a.jpg', 'pro') RETURNING id`,
      [viewer, `${P} image post`],
    ))[0].id as string;
    const vidPost = (await q(
      `INSERT INTO feed_posts (author_id, author_type, post_type, content, media_type, media_url, thumbnail_url, feed_surface)
       VALUES ($1, 'user', 'video', $2, 'video', 'https://example.com/v.m3u8', 'https://example.com/v.jpg', 'pulse') RETURNING id`,
      [author, `${P} video post`],
    ))[0].id as string;
    postIds.push(imgPost, vidPost);
    const storyId = (await q(
      `INSERT INTO stories (author_id, media_url, media_type, expires_at) VALUES ($1, 'https://example.com/s.jpg', 'image', now() + interval '1 day') RETURNING id`,
      [author],
    ))[0].id as string;
    storyIds.push(storyId);

    console.log("signed out");
    let r = await call("GET", "/api/discover/feed");
    assert(r.status === 200 && Array.isArray(r.body?.posts), "feed 200 with posts array", r);
    r = await call("GET", "/api/discover/feed?scope=following");
    assert(r.status === 200 && r.body?.requiresAuth === true, "following feed requiresAuth", r);
    r = await call("GET", "/api/discover/pulse");
    assert(r.status === 200 && Array.isArray(r.body?.data?.videos), "pulse 200 with data.videos array", r);
    r = await call("GET", "/api/discover/stories");
    assert(r.status === 200, "stories 200", r);
    r = await call("POST", `/api/discover/posts/${imgPost}/like`);
    assert(r.status === 401, "like POST 401", r);
    r = await call("POST", `/api/discover/posts/${imgPost}/comments`, { body: { content: "Hi." } });
    assert(r.status === 401, "comment POST 401", r);
    r = await call("GET", `/api/discover/follow/${author}`);
    assert(r.status === 401, "follow check 401", r);

    console.log("location never saved");
    r = await call("GET", "/api/discover/feed?lat=1&lng=2&city=Nowhere", { token: viewerTok, cookie });
    assert(r.status === 200, "feed with lat/lng signed in 200", r);
    r = await call("GET", "/api/discover/pulse?lat=1&lng=2&city=Nowhere", { token: viewerTok, cookie });
    assert(r.status === 200, "pulse with lat/lng signed in 200", r);
    const loc = (await q(`SELECT latitude, longitude FROM users WHERE id = $1`, [viewer]))[0];
    assert(loc.latitude === null && loc.longitude === null, "users.latitude and longitude still NULL", loc);

    console.log("signed in, token and session cookie");
    const A = { token: viewerTok, cookie };
    const findPost = (b: Json) => (b?.posts ?? []).find((p: Json) => p.id === imgPost);
    r = await call("GET", "/api/discover/feed?limit=50", A);
    assert(!!findPost(r.body), "seeded image post is in the feed", { status: r.status, n: r.body?.posts?.length });
    r = await call("POST", `/api/discover/posts/${imgPost}/like`, A);
    assert(r.status === 200, "like POST 200", r);
    r = await call("GET", "/api/discover/feed?limit=50", A);
    assert(findPost(r.body)?.isLiked === true, "feed shows isLiked true", findPost(r.body));
    r = await call("DELETE", `/api/discover/posts/${imgPost}/like`, A);
    assert(r.status === 200, "like DELETE 200", r);
    r = await call("POST", `/api/discover/posts/${imgPost}/save`, A);
    assert(r.status === 200, "save POST 200", r);
    r = await call("DELETE", `/api/discover/posts/${imgPost}/save`, A);
    assert(r.status === 200, "save DELETE 200", r);
    r = await call("POST", `/api/discover/posts/${imgPost}/comments`, { ...A, body: { content: "  Nice.  " } });
    assert(r.status === 200, "comment POST 200", r);
    r = await call("GET", `/api/discover/posts/${imgPost}/comments`, A);
    assert(JSON.stringify(r.body).includes("Nice."), "comment GET lists it", r);
    r = await call("POST", "/api/discover/pulse/engagement", { ...A, body: { postId: vidPost, watchTimeMs: 1500, videoDurationMs: 10000 } });
    assert(r.status === 200, "engagement POST 200", r);
    r = await call("POST", `/api/discover/stories/${storyId}/view`, A);
    assert(r.status === 200, "story view POST 200", r);
    r = await call("POST", `/api/discover/follow/${author}`, A);
    assert(r.status === 200 || r.status === 201, "follow POST 200 or 201", r);
    r = await call("GET", `/api/discover/follow/${author}`, A);
    assert(r.body?.isFollowing === true, "follow GET isFollowing true", r);
    r = await call("DELETE", `/api/discover/follow/${author}`, A);
    assert(r.status === 200, "follow DELETE 200", r);
    r = await call("GET", `/api/discover/follow/${author}`, A);
    assert(r.body?.isFollowing === false, "follow GET isFollowing false after delete", r);

    console.log("token only, no connect.sid");
    const T = { token: viewerTok };
    r = await call("POST", `/api/discover/posts/${imgPost}/comments`, { ...T, body: { content: "No session." } });
    assert(r.status === 401, "comment POST 401", r);
    r = await call("POST", "/api/discover/pulse/engagement", { ...T, body: { postId: vidPost, watchTimeMs: 1500, videoDurationMs: 10000 } });
    assert(r.status === 401, "engagement POST 401", r);
    r = await call("POST", `/api/discover/posts/${imgPost}/like`, T);
    assert(r.status === 200, "like POST 200", r);
    r = await call("DELETE", `/api/discover/posts/${imgPost}/like`, T);
    assert(r.status === 200, "like DELETE 200", r);

    console.log("invalid input");
    r = await call("POST", `/api/discover/posts/${imgPost}/comments`, { ...A, body: { content: "" } });
    assert(r.status === 400, "empty comment 400", r);
    r = await call("POST", `/api/discover/posts/${imgPost}/comments`, { ...A, body: { content: "   " } });
    assert(r.status === 400, "blank comment 400", r);
    r = await call("POST", `/api/discover/posts/${imgPost}/comments`, { ...A, body: { content: "x".repeat(501) } });
    assert(r.status === 400, "501 character comment 400", r);
    r = await call("POST", `/api/discover/posts/${imgPost}/comments`, { ...A, raw: "[]" });
    assert(r.status === 400, "non-object comment body 400", r);
    r = await call("POST", "/api/discover/pulse/engagement", { ...A, body: { postId: "x" } });
    assert(r.status === 400 && r.body?.code === "INVALID_BODY", "engagement bad body 400 INVALID_BODY", r);
    r = await call("POST", "/api/discover/pulse/engagement", { ...A, body: { postId: vidPost, watchTimeMs: -1, videoDurationMs: 10 } });
    assert(r.status === 400, "negative watchTimeMs 400", r);
    r = await call("POST", "/api/discover/posts/not-a-uuid/like", A);
    assert(r.status === 404, "like on not-a-uuid 404", r);
    r = await call("POST", "/api/discover/stories/not-a-uuid/view", A);
    assert(r.status === 404, "story view on not-a-uuid 404", r);
    r = await call("GET", "/api/discover/follow/not-a-uuid", A);
    assert(r.status === 404, "follow check on not-a-uuid 404", r);
  } finally {
    const run = async (t: string, p: unknown[]) => { try { await db.query(t, p); } catch (e) { console.error("cleanup failed:", t.slice(0, 40), (e as Error).message); } };
    await run(`DELETE FROM sessions WHERE sid = ANY($1)`, [sids]);
    await run(`DELETE FROM post_comments WHERE post_id = ANY($1) OR user_id = ANY($2)`, [postIds, userIds]);
    await run(`DELETE FROM post_likes WHERE post_id = ANY($1)`, [postIds]);
    await run(`DELETE FROM user_saved_posts WHERE post_id = ANY($1)`, [postIds]);
    await run(`DELETE FROM pulse_engagements WHERE post_id = ANY($1)`, [postIds]);
    await run(`DELETE FROM feed_engagement_events WHERE post_id = ANY($1)`, [postIds]);
    await run(`DELETE FROM post_distribution WHERE post_id = ANY($1)`, [postIds]);
    await run(`DELETE FROM notifications WHERE user_id = ANY($1)`, [userIds]);
    await run(`DELETE FROM user_interests WHERE user_id = ANY($1)`, [userIds]);
    await run(`DELETE FROM follows WHERE follower_user_id = ANY($1) OR target_user_id = ANY($1)`, [userIds]);
    await run(`DELETE FROM story_views WHERE story_id = ANY($1)`, [storyIds]);
    await run(`DELETE FROM stories WHERE id = ANY($1)`, [storyIds]);
    await run(`DELETE FROM feed_posts WHERE id = ANY($1)`, [postIds]);
    await run(`DELETE FROM users WHERE id = ANY($1)`, [userIds]);
    await db.end();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
