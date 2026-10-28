/**
 * p4-loginlimit (2026-10-28): the log in and password reset BFFs forward the visitor's address and,
 * when OUTSYDE_PROXY_KEY is set, the key, so the backend counts each goutsyde.com visitor on its own.
 * A backend 429 shows "Too many tries…" instead of "Invalid email/username or password."
 *
 * Run with: npx tsx tests/login-limit-bff.http.test.ts   (self contained: stub backend, routes called in process)
 *
 * Mutation check: drop `...visitorHeaders(req.headers)` from app/api/login/route.ts → the login
 * header checks fail.
 */
import http from "http";
import type { AddressInfo } from "net";

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.error(`  FAIL ${name}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 400)); }
}

const LIMIT = "Too many tries. Please wait a few minutes and try again.";
type Seen = { path: string; headers: http.IncomingHttpHeaders; body: any };
const seen: Seen[] = [];
let reply: { status: number; body: unknown } = { status: 200, body: {} };

(async () => {
  const stub = http.createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      let body: any = null;
      try { body = JSON.parse(b); } catch {}
      seen.push({ path: req.url || "", headers: req.headers, body });
      res.writeHead(reply.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((r) => stub.listen(0, "127.0.0.1", () => r()));
  process.env.OUTSYDE_BACKEND_URL = `http://127.0.0.1:${(stub.address() as AddressInfo).port}`;
  const { NextRequest } = await import("next/server");
  const mk = (body: unknown, xff = "203.0.113.7, 10.0.0.1") =>
    new NextRequest(new URL("/x", "http://localhost:3100"), { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", "x-forwarded-for": xff } });

  const routes: Array<[string, string, () => Promise<{ POST: (r: any) => Promise<Response> }>, unknown, unknown]> = [
    ["/api/login", "/api/auth/mobile/login", () => import("../app/api/login/route"), { identifier: "maya@email.com", password: "x" }, { user: { isVendor: false }, accessToken: "t" }],
    ["/api/subscription/login", "/api/auth/mobile/login", () => import("../app/api/subscription/login/route"), { email: "v@email.com", password: "x" }, { user: { isVendor: true }, accessToken: "t" }],
    ["/api/auth/forgot-password", "/api/auth/forgot-password", () => import("../app/api/auth/forgot-password/route"), { email: "maya@email.com" }, { success: true }],
    ["/api/auth/reset-password", "/api/auth/reset-password", () => import("../app/api/auth/reset-password/route"), { token: "t", email: "maya@email.com", newPassword: "abcdef" }, { success: true }],
    ["/api/account-setup/verify-code", "/api/auth/forgot-password/verify-code", () => import("../app/api/account-setup/verify-code/route"), { email: "maya@email.com", code: "123456" }, { success: true, resetToken: "r" }],
  ];

  try {
    for (const keyOn of [false, true]) {
      if (keyOn) process.env.OUTSYDE_PROXY_KEY = "k".repeat(48);
      else delete process.env.OUTSYDE_PROXY_KEY;
      console.log(keyOn ? "key set" : "key unset");
      for (const [name, upstream, load, body, ok] of routes) {
        reply = { status: 200, body: ok };
        seen.length = 0;
        const mod = await load();
        const res = await mod.POST(mk(body));
        const s = seen.find((x) => x.path === upstream);
        assert(!!s && res.status === 200, `${name}: reaches ${upstream}`, { status: res.status, paths: seen.map((x) => x.path) });
        assert(s?.headers["x-outsyde-client-ip"] === "203.0.113.7", `${name}: forwards the visitor address (first x-forwarded-for entry)`, s?.headers["x-outsyde-client-ip"]);
        assert(keyOn ? s?.headers["x-outsyde-proxy-key"] === "k".repeat(48) : s?.headers["x-outsyde-proxy-key"] === undefined, `${name}: proxy key ${keyOn ? "sent" : "not sent"}`, s?.headers["x-outsyde-proxy-key"]);
      }
    }

    console.log("no usable visitor address");
    const login = await import("../app/api/login/route");
    reply = { status: 200, body: { user: { isVendor: false }, accessToken: "t" } };
    seen.length = 0;
    await login.POST(mk({ identifier: "maya@email.com", password: "x" }, "not-an-ip"));
    assert(seen[0]?.headers["x-outsyde-client-ip"] === undefined, "bad x-forwarded-for: no client ip header", seen[0]?.headers["x-outsyde-client-ip"]);

    console.log("429 copy");
    const limited = { success: false, code: "RATE_LIMITED", message: LIMIT, error: { code: "RATE_LIMITED", message: LIMIT } };
    reply = { status: 429, body: limited };
    let res = await login.POST(mk({ identifier: "maya@email.com", password: "x" }));
    let b: any = await res.json();
    assert(res.status === 429 && b?.error === LIMIT && b?.code === "RATE_LIMITED", "/api/login 429 says too many tries, not invalid password", b);
    const sub = await import("../app/api/subscription/login/route");
    res = await sub.POST(mk({ email: "v@email.com", password: "x" }));
    b = await res.json();
    assert(res.status === 429 && b?.error === LIMIT, "/api/subscription/login 429 says too many tries", b);
    reply = { status: 401, body: { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" } } };
    res = await login.POST(mk({ identifier: "maya@email.com", password: "x" }));
    b = await res.json();
    assert(res.status === 401 && b?.error === "Invalid credentials" && b?.code === "INVALID_CREDENTIALS", "/api/login 401 unchanged", b);
  } finally {
    stub.close();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
