/**
 * Quick sign up BFF (/api/quick-signup), the regular sign up token cookie (/api/consumer-signup)
 * and the shared cookie helper (p4-quicksignup, 2026-10-28).
 *
 * Run with: npx tsx tests/quick-signup-bff.http.test.ts
 *
 * Self contained: starts a stub backend on 127.0.0.1 and calls the route handlers in process,
 * so no Next server and no database are needed.
 *
 * Mutation check: drop the token cookie append in app/api/consumer-signup/route.ts →
 * "consumer-signup 200 now sets outsyde_access_token" fails.
 */
import http from "http";
import type { AddressInfo } from "net";

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ok  ${name}`); }
  else { failed++; console.error(`  FAIL ${name}`, detail === undefined ? "" : JSON.stringify(detail).slice(0, 500)); }
}

type Seen = { method: string; path: string; headers: http.IncomingHttpHeaders; body: any };
const seen: Seen[] = [];
let nextReply: { status: number; body: unknown; setCookie?: string[] } = { status: 200, body: {} };

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1MSJ9.sig";
const OLD_LITERAL = (t: string, prod: boolean) => `outsyde_access_token=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${prod ? "; Secure" : ""}`;

(async () => {
  const stub = http.createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      let body: any = null;
      try { body = JSON.parse(b); } catch {}
      seen.push({ method: req.method || "", path: req.url || "", headers: req.headers, body });
      const headers: Record<string, string | string[]> = { "Content-Type": "application/json" };
      if (nextReply.setCookie) headers["Set-Cookie"] = nextReply.setCookie;
      res.writeHead(nextReply.status, headers);
      res.end(JSON.stringify(nextReply.body));
    });
  });
  await new Promise<void>((r) => stub.listen(0, "127.0.0.1", () => r()));
  const port = (stub.address() as AddressInfo).port;
  process.env.OUTSYDE_BACKEND_URL = `http://127.0.0.1:${port}`;

  const { NextRequest } = await import("next/server");
  const mk = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    new NextRequest(new URL(path, "http://localhost:3100"), {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json", ...headers },
    });
  const cookiesOf = (res: Response) => (typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : []);
  const tokenCookie = (res: Response) => cookiesOf(res).find((c) => c.startsWith("outsyde_access_token="));

  const ok200 = { success: true, user: { id: "u1", email: "maya@email.com" }, accessToken: TOKEN, refreshToken: "r1", expiresIn: 604800, referralApplied: false };
  const form = { firstName: "Maya", email: "maya@email.com", phone: "(516) 555 0142", password: "secret1" };

  try {
    console.log("lib/auth-cookie");
    const { accessTokenCookie, clientIpFrom } = await import("../lib/auth-cookie");
    const envAny = process.env as Record<string, string | undefined>;
    const prevEnv = envAny.NODE_ENV;
    envAny.NODE_ENV = "development";
    assert(accessTokenCookie(TOKEN) === OLD_LITERAL(TOKEN, false), "cookie string matches the login literal (dev)", accessTokenCookie(TOKEN));
    envAny.NODE_ENV = "production";
    assert(accessTokenCookie(TOKEN) === OLD_LITERAL(TOKEN, true), "cookie string matches the login literal (production adds Secure)", accessTokenCookie(TOKEN));
    envAny.NODE_ENV = prevEnv;
    assert(clientIpFrom(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })) === "203.0.113.7", "clientIpFrom: first x-forwarded-for entry");
    assert(clientIpFrom(new Headers({ "x-real-ip": " 203.0.113.9 " })) === "203.0.113.9", "clientIpFrom: x-real-ip when no x-forwarded-for");
    assert(clientIpFrom(new Headers({ "x-forwarded-for": "2001:db8::1" })) === "2001:db8::1", "clientIpFrom: IPv6");
    assert(clientIpFrom(new Headers({ "x-forwarded-for": "not-an-ip" })) === null, "clientIpFrom: not an IP → null");
    assert(clientIpFrom(new Headers({ "x-forwarded-for": "not-an-ip", "x-real-ip": "203.0.113.9" })) === "203.0.113.9", "clientIpFrom: bad first entry falls back to x-real-ip");
    assert(clientIpFrom(new Headers()) === null, "clientIpFrom: nothing → null");

    console.log("POST /api/quick-signup");
    delete process.env.OUTSYDE_PROXY_KEY;
    const quick = await import("../app/api/quick-signup/route");
    nextReply = { status: 200, body: ok200, setCookie: ["refreshToken=r1; Path=/; HttpOnly", "connect.sid=s1; Path=/; HttpOnly"] };
    seen.length = 0;
    let res = await quick.POST(mk("/api/quick-signup", { ...form, isAdmin: true, source: "x" }, { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
    let body: any = await res.json();
    assert(res.status === 200 && body?.ok === true && body?.email === "maya@email.com", "200 returns { ok, email }", { status: res.status, body });
    assert(!JSON.stringify(body).includes(TOKEN) && !("accessToken" in body) && !("refreshToken" in body), "response body has no accessToken", body);
    const tc = tokenCookie(res);
    assert(!!tc && tc.includes(`outsyde_access_token=${TOKEN}`) && tc.includes("Max-Age=604800") && tc.includes("HttpOnly") && tc.includes("SameSite=Lax") && tc.includes("Path=/"),
      "200 sets outsyde_access_token cookie with Max-Age=604800 and HttpOnly", cookiesOf(res));
    assert(cookiesOf(res).some((c) => c.startsWith("connect.sid=")), "backend session cookie forwarded like login", cookiesOf(res));
    assert(seen.length === 1 && seen[0].path === "/api/auth/customer/quick-signup" && seen[0].method === "POST", "forwards to the backend quick sign up route", seen.map((s) => s.path));
    assert(seen[0]?.headers["x-outsyde-client-ip"] === "203.0.113.7", "stub saw x-outsyde-client-ip = first x-forwarded-for entry", seen[0]?.headers["x-outsyde-client-ip"]);
    assert(seen[0]?.headers["x-outsyde-proxy-key"] === undefined, "stub saw no proxy key when env unset", seen[0]?.headers["x-outsyde-proxy-key"]);
    assert(JSON.stringify(Object.keys(seen[0]?.body || {}).sort()) === JSON.stringify(["email", "firstName", "password", "phone"]), "only the four quick fields are forwarded", seen[0]?.body);

    process.env.OUTSYDE_PROXY_KEY = "k".repeat(48);
    seen.length = 0;
    res = await quick.POST(mk("/api/quick-signup", form, { "x-forwarded-for": "203.0.113.8" }));
    assert(seen[0]?.headers["x-outsyde-proxy-key"] === "k".repeat(48), "stub saw proxy key only when env set", seen[0]?.headers["x-outsyde-proxy-key"]);
    seen.length = 0;
    res = await quick.POST(mk("/api/quick-signup", form));
    assert(seen[0]?.headers["x-outsyde-client-ip"] === undefined, "no visitor address known → no client ip header", seen[0]?.headers["x-outsyde-client-ip"]);
    delete process.env.OUTSYDE_PROXY_KEY;

    nextReply = { status: 409, body: { success: false, code: "EMAIL_EXISTS", message: "That email already has an Outsyde account.", error: "That email already has an Outsyde account." } };
    res = await quick.POST(mk("/api/quick-signup", form));
    body = await res.json();
    assert(res.status === 409 && body?.code === "EMAIL_EXISTS", "409 passes through with code EMAIL_EXISTS", { status: res.status, body });
    assert(!tokenCookie(res), "no token cookie on 409", cookiesOf(res));

    nextReply = { status: 429, body: { success: false, code: "RATE_LIMITED", message: "Too many sign ups from this network. Please try again in a few minutes." } };
    res = await quick.POST(mk("/api/quick-signup", form));
    body = await res.json();
    assert(res.status === 429 && body?.code === "RATE_LIMITED", "429 passes through", { status: res.status, body });

    nextReply = { status: 400, body: { success: false, code: "PHONE_REQUIRED" } };
    res = await quick.POST(mk("/api/quick-signup", form));
    body = await res.json();
    assert(res.status === 400 && body?.code === "PHONE_REQUIRED", "400 passes through", { status: res.status, body });

    nextReply = { status: 200, body: { success: true } };
    res = await quick.POST(mk("/api/quick-signup", form));
    body = await res.json();
    assert(res.status === 502 && !tokenCookie(res), "200 without a token is not treated as signed in", { status: res.status, body });

    res = await quick.POST(mk("/api/quick-signup", "{nope"));
    assert(res.status === 400, "invalid JSON is 400", res.status);

    process.env.OUTSYDE_BACKEND_URL = "http://127.0.0.1:1";
    res = await quick.POST(mk("/api/quick-signup", form));
    body = await res.json();
    assert(res.status === 502 && body?.error === "Couldn’t reach the server. Please try again.", "network failure → 502 with the message", { status: res.status, body });
    process.env.OUTSYDE_BACKEND_URL = `http://127.0.0.1:${port}`;

    console.log("POST /api/consumer-signup");
    const consumer = await import("../app/api/consumer-signup/route");
    nextReply = { status: 200, body: ok200, setCookie: ["refreshToken=r1; Path=/; HttpOnly"] };
    seen.length = 0;
    res = await consumer.POST(mk("/api/consumer-signup", { email: "a@b.co", password: "secret1", name: "A" }));
    body = await res.json();
    assert(res.status === 200 && body?.success === true, "consumer-signup body unchanged", body);
    assert(seen[0]?.path === "/api/auth/customer/signup", "consumer-signup still calls the regular route", seen[0]?.path);
    assert(cookiesOf(res).some((c) => c.startsWith("refreshToken=")), "consumer-signup still forwards the backend Set-Cookie", cookiesOf(res));
    assert(tokenCookie(res) === OLD_LITERAL(TOKEN, process.env.NODE_ENV === "production"), "consumer-signup 200 now sets outsyde_access_token", cookiesOf(res));
    nextReply = { status: 400, body: { error: "Email already registered" } };
    res = await consumer.POST(mk("/api/consumer-signup", { email: "a@b.co", password: "secret1", name: "A" }));
    body = await res.json();
    assert(res.status === 400 && body?.error === "Email already registered" && !tokenCookie(res), "consumer-signup error passes through, no token cookie", { status: res.status, body });

    console.log("POST /api/login");
    const login = await import("../app/api/login/route");
    nextReply = { status: 200, body: { user: { isVendor: false }, accessToken: TOKEN }, setCookie: ["connect.sid=s1; Path=/"] };
    res = await login.POST(mk("/api/login", { identifier: "maya@email.com", password: "secret1" }));
    assert(tokenCookie(res) === OLD_LITERAL(TOKEN, process.env.NODE_ENV === "production"), "login still sets the identical cookie string", cookiesOf(res));
  } finally {
    stub.close();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
