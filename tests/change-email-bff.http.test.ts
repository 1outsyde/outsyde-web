/**
 * Change email BFF routes (/api/account/email-change, /request, /confirm) end to end: site → backend → Postgres.
 *
 * Run with: npx tsx tests/change-email-bff.http.test.ts
 *
 * LOCAL ONLY. Needs:
 *  - this site running with OUTSYDE_BACKEND_URL pointing at a localhost outsyde-backend (main with #426 + #428)
 *  - that backend on a scratch Postgres with migration 107, started with RESEND_API_KEY=re_test and
 *    RESEND_BASE_URL=http://127.0.0.1:<CE_RESEND_PORT> so emails reach this script's Resend stub, never Resend
 * Env (defaults shown): CE_WEB_URL=http://localhost:3077  CE_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde
 *   CE_JWT_SECRET=dev-jwt-secret-outsyde-2024  CE_BACKEND_DIR=/home/claude/outsyde-backend  CE_RESEND_PORT=5098
 * Skips (exit 0) when the site is not reachable. Seeds users with ids starting "ceb-" and removes them at the end.
 */
import { createRequire } from "module";
import { createServer } from "http";

const WEB = process.env.CE_WEB_URL || "http://localhost:3077";
const PG_URL = process.env.CE_PG_URL || "postgresql://outsyde:outsyde@localhost:5432/outsyde";
const SECRET = process.env.CE_JWT_SECRET || "dev-jwt-secret-outsyde-2024";
const BACKEND_DIR = (process.env.CE_BACKEND_DIR || "/home/claude/outsyde-backend").replace(/\/+$/, "");
const RESEND_PORT = Number(process.env.CE_RESEND_PORT || 5098);

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
  for (const u of [WEB, PG_URL]) if (!isLocal(u)) throw new Error("refusing to run: CE_WEB_URL and CE_PG_URL must be localhost");
  try { await fetch(new URL("/", WEB), { method: "HEAD" }); } catch { console.log(`skipped: web server not reachable at ${WEB}`); process.exit(0); }

  // Resend stub: records every email the backend sends.
  const mails: { to: string[]; subject: string; html: string }[] = [];
  const stub = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        const b = JSON.parse(raw || "{}");
        mails.push({ to: Array.isArray(b.to) ? b.to : [b.to], subject: b.subject, html: b.html });
      } catch { /* ignore */ }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: `stub_${mails.length}` }));
    });
  });
  await new Promise<void>((r) => stub.listen(RESEND_PORT, "127.0.0.1", () => r()));
  const codeFor = (to: string) => {
    const m = [...mails].reverse().find((x) => x.to.includes(to) && /email change code/i.test(x.subject));
    return m?.html.match(/>(\d{6})</)?.[1] ?? null;
  };

  const req = createRequire(`${BACKEND_DIR}/package.json`);
  const pg = req("pg");
  const jwt = req("jsonwebtoken");
  const db = new pg.Client({ connectionString: PG_URL });
  await db.connect();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = async (t: string, p: unknown[] = []) => (await db.query(t, p)).rows as Record<string, any>[];
  const bcrypt = req("bcrypt");

  const ids = ["ceb-pw", "ceb-oauth", "ceb-other"];
  await q(`DELETE FROM users WHERE id = ANY($1)`, [ids]);
  const hash = await bcrypt.hash("secret123", 4);
  await q(`INSERT INTO users (id, username, email, password) VALUES ('ceb-pw', 'cebpw', 'ceb-pw@old.test', $1)`, [hash]);
  await q(`INSERT INTO users (id, username, email, password) VALUES ('ceb-oauth', 'ceboauth', 'ceb-oauth@old.test', NULL)`);
  await q(`INSERT INTO users (id, username, email, password) VALUES ('ceb-other', 'cebother', 'Taken@New.Test', $1)`, [hash]);
  const tok = (id: string) => jwt.sign({ userId: id, isVendor: false }, SECRET, { expiresIn: "1h" });
  const pw = tok("ceb-pw"), oauth = tok("ceb-oauth");
  const email = async (id: string) => (await q(`SELECT email FROM users WHERE id = $1`, [id]))[0]?.email;

  try {
    console.log("auth");
    for (const [m, p] of [["GET", "/api/account/email-change"], ["DELETE", "/api/account/email-change"], ["POST", "/api/account/email-change/request"], ["POST", "/api/account/email-change/confirm"]] as const) {
      const r = await call(m, p, { body: m === "POST" ? { newEmail: "x@y.co", code: "123456" } : undefined });
      assert(r.status === 401 && r.body?.error?.code === "AUTH_REQUIRED", `${m} ${p} without a cookie: 401`, r);
    }

    console.log("GET");
    const g1 = await call("GET", "/api/account/email-change", { token: pw });
    assert(g1.status === 200 && g1.body.passwordRequired === true && g1.body.pending === null, "password account: passwordRequired true, nothing open", g1);
    const g2 = await call("GET", "/api/account/email-change", { token: oauth });
    assert(g2.status === 200 && g2.body.passwordRequired === false, "Google or Apple only account: passwordRequired false", g2);

    console.log("request: BFF guards");
    const bad = await call("POST", "/api/account/email-change/request", { token: pw, raw: "{not json" });
    assert(bad.status === 400 && bad.body?.error?.code === "INVALID_EMAIL", "bad JSON: 400 before reaching the backend", bad);
    const noEmail = await call("POST", "/api/account/email-change/request", { token: pw, body: { password: "secret123" } });
    assert(noEmail.status === 400 && noEmail.body?.error?.code === "INVALID_EMAIL", "missing newEmail: 400", noEmail);
    const extra = await call("POST", "/api/account/email-change/request", { token: pw, body: { newEmail: "ceb-new@new.test", password: "nope", isAdmin: true } });
    assert(extra.status === 401 && extra.body?.error?.code === "WRONG_PASSWORD", "extra fields dropped (backend .strict() would refuse them), wrong password passes through 401", extra);

    console.log("request: backend refusals pass through");
    const taken = await call("POST", "/api/account/email-change/request", { token: pw, body: { newEmail: "taken@new.test", password: "secret123" } });
    assert(taken.status === 409 && taken.body?.error?.code === "EMAIL_TAKEN" && typeof taken.body?.error?.message === "string", "taken: 409 with the backend's message", taken);
    const same = await call("POST", "/api/account/email-change/request", { token: pw, body: { newEmail: "CEB-PW@old.test", password: "secret123" } });
    assert(same.status === 400 && same.body?.error?.code === "SAME_EMAIL", "same email: 400", same);

    console.log("request → confirm (password account)");
    const r1 = await call("POST", "/api/account/email-change/request", { token: pw, body: { newEmail: " CEB-New@New.Test ", password: "secret123" } });
    assert(r1.status === 200 && r1.body.pending?.newEmail === "ceb-new@new.test", "code requested", r1);
    const code = codeFor("ceb-new@new.test");
    assert(!!code, "code email reached the NEW address (Resend stub)", mails.map((m) => ({ to: m.to, subject: m.subject })));
    const g3 = await call("GET", "/api/account/email-change", { token: pw });
    assert(g3.body.pending?.newEmail === "ceb-new@new.test" && g3.body.pending?.triesLeft === 5, "GET shows the open request", g3);
    const wrong = await call("POST", "/api/account/email-change/confirm", { token: pw, body: { code: code === "000000" ? "000001" : "000000" } });
    assert(wrong.status === 400 && wrong.body?.error?.code === "WRONG_CODE" && wrong.body?.triesLeft === 4, "wrong code: 400 with triesLeft passed through", wrong);
    const ok = await call("POST", "/api/account/email-change/confirm", { token: pw, body: { code, extra: "x" } });
    assert(ok.status === 200 && ok.body.email === "ceb-new@new.test", "right code: 200", ok);
    assert((await email("ceb-pw")) === "ceb-new@new.test", "account email moved in Postgres");
    assert(mails.some((m) => m.to.includes("ceb-pw@old.test") && /was changed/i.test(m.subject)), "notice sent to the OLD address");
    const me = await call("GET", "/api/auth/me", { token: pw });
    assert(me.body?.user?.email === "ceb-new@new.test", "/api/auth/me (the top menu and Settings) shows the new email right away", me.body?.user?.email);
    const g4 = await call("GET", "/api/account/email-change", { token: pw });
    assert(g4.body.pending === null, "nothing open after confirming", g4);

    console.log("request → cancel (Google or Apple only account, no password)");
    const r2 = await call("POST", "/api/account/email-change/request", { token: oauth, body: { newEmail: "ceb-oauth2@new.test" } });
    assert(r2.status === 200, "no password needed", r2);
    const del = await call("DELETE", "/api/account/email-change", { token: oauth });
    assert(del.status === 200 && del.body.cancelled === true, "DELETE cancels", del);
    const after = await call("POST", "/api/account/email-change/confirm", { token: oauth, body: { code: codeFor("ceb-oauth2@new.test") } });
    assert(after.status === 404 && after.body?.error?.code === "NO_PENDING", "confirm after cancel: 404", after);
    assert((await email("ceb-oauth")) === "ceb-oauth@old.test", "email unchanged after cancel");

    console.log("confirm: BFF guard");
    const noCode = await call("POST", "/api/account/email-change/confirm", { token: oauth, body: {} });
    assert(noCode.status === 400 && noCode.body?.error?.code === "INVALID_CODE", "missing code: 400", noCode);
  } finally {
    await q(`DELETE FROM audit_logs WHERE target_id = ANY($1)`, [ids]);
    await q(`DELETE FROM users WHERE id = ANY($1)`, [ids]);
    await db.end();
    stub.close();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
