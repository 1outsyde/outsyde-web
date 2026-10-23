/**
 * Auth minting for the Discover http tests (LOCAL ONLY). Never logs in through /api/login (the backend limits it to
 * 5 per 15 minutes per IP). Loads jsonwebtoken, cookie-signature and pg from an outsyde-backend checkout.
 *   token  = JWT signed with the local backend's secret "test"
 *   cookie = connect.sid signed with "localsessionsecret", backed by a row in the local `sessions` table
 */
import { createRequire } from "module";

export function backendRequire(backendDir: string): NodeRequire {
  return createRequire(`${backendDir.replace(/\/+$/, "")}/package.json`);
}

export function mintToken(backendDir: string, userId: string): string {
  const jwt = backendRequire(backendDir)("jsonwebtoken");
  return jwt.sign({ userId, isVendor: false }, "test", { expiresIn: "1h" });
}

type Queryable = { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

/** Insert a session row for the user and return the signed Cookie value plus the sid (delete the row when done). */
export async function mintSessionCookie(backendDir: string, db: Queryable, userId: string): Promise<{ cookie: string; sid: string }> {
  const sign = backendRequire(backendDir)("cookie-signature").sign as (v: string, s: string) => string;
  const sid = `discover-test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  const sess = { cookie: { originalMaxAge: 604800000, expires, httpOnly: true, path: "/" }, userId };
  await db.query(`INSERT INTO sessions (sid, sess, expire) VALUES ($1, $2::json, now() + interval '7 days')`, [sid, JSON.stringify(sess)]);
  return { cookie: `connect.sid=${encodeURIComponent("s:" + sign(sid, "localsessionsecret"))}`, sid };
}
