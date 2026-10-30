"""LOCAL ONLY. Promoter links on /e/[slug] (Event team step 3), against a stub backend (no database).

The page remembers `?ref=<CODE>` for that event for 7 days and sends it as `linkCode` with RSVP and checkout.
The last link opened wins. No code (or a bad one) sends exactly what the page sent before.

Run: start a stub with `python3 tests/promoter-ref.browser.py --stub 5096`, then start the site with
OUTSYDE_BACKEND_URL=http://127.0.0.1:5096 npx next dev -p 3109, then
`WEB=http://localhost:3109 STUB=http://127.0.0.1:5096 python3 tests/promoter-ref.browser.py`.
Checkout's request only goes out once Stripe.js loads (blocked here), so for checkout this checks the code is still
remembered after the page drops it from the address; the checkout body itself is covered by
tests/promoter-ref-logic.test.ts (withLinkCode).
"""
import json, os, sys, threading
from datetime import datetime, timedelta, timezone

PAID = "pr-paid"
FREE = "pr-free"
TT_PAID = "22222222-3333-4444-8555-666666666666"
TT_FREE = "33333333-4444-4555-8666-777777777777"
EV_PAID = "44444444-5555-4666-8777-888888888888"
EV_FREE = "55555555-6666-4777-8888-999999999999"
GOOD_PASS = "rightpass"
STATE = {"log": []}
LOCK = threading.Lock()


def event_payload(slug):
    start = datetime.now(timezone.utc) + timedelta(days=3)
    iso = lambda d: d.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    paid = slug == PAID
    return {
        "success": True,
        "event": {
            "id": EV_PAID if paid else EV_FREE, "slug": slug, "status": "published", "title": "Late Night Party" if paid else "Free Block Party", "description": "A test event.",
            "coverImageUrl": None, "startsAt": iso(start), "endsAt": iso(start + timedelta(hours=4)), "timezone": "America/New_York",
            "venueName": None, "addressLine1": None, "addressLine2": None, "city": "Freeport", "state": "NY", "postalCode": None,
            "latitude": None, "longitude": None, "addressHidden": True, "addressRevealAt": None,
            "refundPolicy": "no_refunds", "refundCutoffHours": None, "visibility": "public", "soldOut": False,
            "host": {"name": "Test Host", "avatarUrl": None, "kind": "user", "followId": None},
            "viewerIsHost": False, "viewerHasTicket": False,
        },
        "ticketTypes": [{
            "id": TT_PAID if paid else TT_FREE, "name": "General admission" if paid else "Free RSVP", "description": None,
            "priceCents": 2000 if paid else 0, "serviceFeeCents": 259 if paid else None, "buyerTotalCents": 2259 if paid else None,
            "salesStatus": "on_sale", "remaining": 50, "salesStartAt": None, "salesEndAt": None,
            "minPerOrder": 1, "maxPerOrder": 4, "perAccountLimit": None,
        }],
    }


def run_stub(port):
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    class H(BaseHTTPRequestHandler):
        def _send(self, code, obj):
            body = json.dumps(obj).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _body(self):
            n = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(n) if n else b""
            try:
                return json.loads(raw or b"null")
            except Exception:
                return {"_raw_len": len(raw)}

        def _authed(self):
            return (self.headers.get("Authorization") or "").startswith("Bearer tok-")

        def do_GET(self):
            if self.path.startswith("/__log"):
                return self._send(200, STATE["log"])
            if self.path.startswith("/__reset"):
                with LOCK:
                    STATE["log"].clear()
                return self._send(200, {"ok": True})
            if self.path.startswith("/api/events/slug/"):
                slug = self.path.split("/api/events/slug/")[1].split("?")[0]
                if slug in (PAID, FREE):
                    return self._send(200, event_payload(slug))
                return self._send(404, {"success": False, "error": {"code": "EVENT_NOT_FOUND", "message": "Event not found."}})
            if self._authed() and self.path.startswith("/api/auth/me"):
                return self._send(200, {"user": {"id": "u-1", "email": "x@y.z"}})
            return self._send(401, {"success": False, "error": "Unauthorized"})

        def do_POST(self):
            body = self._body()
            with LOCK:
                STATE["log"].append({"m": "POST", "p": self.path, "auth": self.headers.get("Authorization"), "body": body})
            p = self.path
            if p == "/api/auth/mobile/login":
                if (body or {}).get("password") == GOOD_PASS:
                    return self._send(200, {"user": {"isVendor": False}, "accessToken": "tok-login"})
                return self._send(401, {"success": False, "error": {"message": "Invalid email/username or password.", "code": "INVALID_CREDENTIALS"}})
            if p.startswith("/api/events/") and p.endswith("/rsvp"):
                if not self._authed():
                    return self._send(401, {"success": False, "code": "NO_AUTH", "error": "Sign in first."})
                return self._send(201, {"success": True, "order": {"id": "ord-1", "status": "completed"}})
            if p.startswith("/api/events/") and p.endswith("/checkout"):
                return self._send(503, {"success": False, "code": "CHECKOUT_CLOSED", "error": "Ticket sales are closed right now."})
            return self._send(404, {"error": "stub: no route"})

        def log_message(self, *a):
            pass

    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()


if "--stub" in sys.argv:
    run_stub(int(sys.argv[sys.argv.index("--stub") + 1]))
    sys.exit(0)

import urllib.request
from playwright.sync_api import sync_playwright

WEB = os.environ.get("WEB", "http://localhost:3109")
STUB = os.environ.get("STUB", "http://127.0.0.1:5096")
passed = failed = 0


def check(ok, name, extra=""):
    global passed, failed
    if ok:
        passed += 1
        print("  ok  ", name)
    else:
        failed += 1
        print("  FAIL", name, extra)


def reset():
    urllib.request.urlopen(f"{STUB}/__reset").read()


def rsvps():
    return [c for c in json.loads(urllib.request.urlopen(f"{STUB}/__log").read()) if c["p"].endswith("/rsvp")]


def new_context(b):
    c = b.new_context(viewport={"width": 390, "height": 844}, color_scheme="dark")
    c.route("**/fonts.googleapis.com/**", lambda r: r.abort())
    c.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    c.route("**/js.stripe.com/**", lambda r: r.abort())
    return c


def visit(pg, path):
    pg.goto(f"{WEB}{path}")
    pg.wait_for_selector("h1.ev-title", timeout=90000)
    pg.wait_for_timeout(700)


def saved(pg, event_id):
    raw = pg.evaluate(f"() => window.localStorage.getItem('outsyde:promoter-ref:{event_id}')")
    return json.loads(raw) if raw else None


def rsvp_signing_in(pg):
    """Signed out RSVP: the sheet opens, log in, the page sends the RSVP itself."""
    pg.click(".ev-cta")
    pg.wait_for_selector("[data-testid=quick-auth-sheet]", timeout=15000)
    pg.click("text=Already have an account? Log in")
    pg.fill("#qa-email", "maya@email.com")
    pg.fill("#qa-pass", GOOD_PASS)
    pg.click(".qa-cta")
    pg.wait_for_selector("[data-testid=going-app]", timeout=15000)


with sync_playwright() as pw:
    b = pw.chromium.launch()

    print("RSVP through a promoter link, signing in on the way")
    reset()
    c = new_context(b); pg = c.new_page()
    visit(pg, f"/e/{FREE}?ref=abcd2345")
    s = saved(pg, EV_FREE)
    check(s is not None and s.get("code") == "ABCD2345", "code saved for this event as it opens", s)
    rsvp_signing_in(pg)
    rs = rsvps()
    check(len(rs) == 1 and rs[0]["body"].get("linkCode") == "ABCD2345", "the RSVP carries the code", rs)
    check(len(rs) == 1 and rs[0]["body"].get("ticketTypeId") == TT_FREE and isinstance(rs[0]["body"].get("idempotencyKey"), str), "rest of the RSVP unchanged", rs)
    c.close()

    print("coming back later without the code in the address")
    reset()
    c = new_context(b); pg = c.new_page()
    visit(pg, f"/e/{FREE}?ref=ABCD2345")
    visit(pg, f"/e/{FREE}")
    rsvp_signing_in(pg)
    rs = rsvps()
    check(len(rs) == 1 and rs[0]["body"].get("linkCode") == "ABCD2345", "remembered code is sent", rs)
    c.close()

    print("last link opened wins")
    reset()
    c = new_context(b); pg = c.new_page()
    visit(pg, f"/e/{FREE}?ref=ABCD2345")
    visit(pg, f"/e/{FREE}?ref=WXYZ6789")
    visit(pg, f"/e/{FREE}")
    rsvp_signing_in(pg)
    rs = rsvps()
    check(len(rs) == 1 and rs[0]["body"].get("linkCode") == "WXYZ6789", "the second promoter gets it", rs)
    c.close()

    print("no code, or a bad code: the RSVP is exactly as before")
    for path, label in ((f"/e/{FREE}", "no code"), (f"/e/{FREE}?ref=nope", "bad code")):
        reset()
        c = new_context(b); pg = c.new_page()
        visit(pg, path)
        check(saved(pg, EV_FREE) is None, f"{label}: nothing saved")
        rsvp_signing_in(pg)
        rs = rsvps()
        check(len(rs) == 1 and "linkCode" not in rs[0]["body"] and sorted(rs[0]["body"].keys()) == ["idempotencyKey", "quantity", "ticketTypeId"],
              f"{label}: no linkCode key, same three fields", rs)
        c.close()

    print("codes are kept per event")
    reset()
    c = new_context(b); pg = c.new_page()
    visit(pg, f"/e/{PAID}?ref=ABCD2345")
    check(saved(pg, EV_PAID) is not None and saved(pg, EV_FREE) is None, "only the event it was opened on", [saved(pg, EV_PAID), saved(pg, EV_FREE)])
    canonical = pg.evaluate("() => document.querySelector('link[rel=canonical]')?.getAttribute('href') || ''")
    check("ref=" not in canonical, "the canonical link has no code", canonical)
    c.close()

    print("paid: the code survives the page dropping it on the way to checkout")
    reset()
    c = new_context(b); pg = c.new_page()
    visit(pg, f"/e/{PAID}?ref=ABCD2345")
    pg.click(".ev-cta")
    pg.wait_for_selector("[data-testid=quick-auth-sheet]", timeout=15000)
    pg.click("text=Already have an account? Log in")
    pg.fill("#qa-email", "maya@email.com")
    pg.fill("#qa-pass", GOOD_PASS)
    pg.click(".qa-cta")
    pg.wait_for_url(f"**checkout={TT_PAID}**", timeout=15000)
    check("ref=" not in pg.url, "checkout address has no code", pg.url)
    s = saved(pg, EV_PAID)
    check(s is not None and s.get("code") == "ABCD2345", "still remembered at checkout", s)
    c.close()

    print("storage blocked: the page still works")
    reset()
    c = new_context(b)
    c.add_init_script("Object.defineProperty(window, 'localStorage', { get() { throw new Error('SecurityError'); } });")
    pg = c.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    visit(pg, f"/e/{FREE}?ref=ABCD2345")
    rsvp_signing_in(pg)
    rs = rsvps()
    check(len(rs) == 1, "the RSVP still goes through", rs)
    check(not any("SecurityError" in e for e in errors), "no page error from storage", errors)
    c.close()
    b.close()

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
