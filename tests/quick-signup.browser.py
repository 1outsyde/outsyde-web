"""LOCAL ONLY. Quick sign up / log in sheet on /e/[slug] (p4-quicksignup), against a stub backend (no database).

Run: start a stub with `python3 tests/quick-signup.browser.py --stub 5098`, then start the site with
OUTSYDE_BACKEND_URL=http://127.0.0.1:5098 npx next dev -p 3108, then `WEB=http://localhost:3108 STUB=http://127.0.0.1:5098 python3 tests/quick-signup.browser.py`.
Optional: SHOTS=<dir> saves 390 px wide screenshots of the sheet and the done card.
"""
import json, os, sys, threading
from datetime import datetime, timedelta, timezone

PAID = "qs-paid"      # paid ticket type, host has a follow id
FREE = "qs-free"      # free RSVP, host has NO follow id (signed in state comes from /api/auth/me)
TAKEN = "taken@email.com"
SETUP = "setup@email.com"     # imported account with no password: login answers ACCOUNT_NEEDS_SETUP
APPLE = "apple@email.com"     # Apple only account: login answers OAUTH_ONLY
HOST_ID = "11111111-2222-4333-8444-555555555555"
TT_PAID = "22222222-3333-4444-8555-666666666666"
TT_FREE = "33333333-4444-4555-8666-777777777777"
EV_PAID = "44444444-5555-4666-8777-888888888888"
EV_FREE = "55555555-6666-4777-8888-999999999999"
GOOD_PASS = "rightpass"

STATE = {"log": [], "uploadFail": False}
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
            "host": {"name": "Test Host", "avatarUrl": None, "kind": "user", "followId": HOST_ID if paid else None},
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
        def _send(self, code, obj, cookies=()):
            body = json.dumps(obj).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            for c in cookies:
                self.send_header("Set-Cookie", c)
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

        def _record(self, body=None):
            with LOCK:
                STATE["log"].append({"m": self.command, "p": self.path, "auth": self.headers.get("Authorization"), "body": body,
                                     "ip": self.headers.get("x-outsyde-client-ip")})

        def do_GET(self):
            if self.path.startswith("/__log"):
                return self._send(200, STATE["log"])
            if self.path.startswith("/__reset"):
                with LOCK:
                    STATE["log"].clear()
                    STATE["uploadFail"] = "uploadFail=1" in self.path
                return self._send(200, {"ok": True})
            if self.path.startswith("/api/events/slug/"):
                slug = self.path.split("/api/events/slug/")[1].split("?")[0]
                if slug in (PAID, FREE):
                    return self._send(200, event_payload(slug))
                return self._send(404, {"success": False, "error": {"code": "EVENT_NOT_FOUND", "message": "Event not found."}})
            self._record()
            if self._authed():
                if self.path.startswith("/api/auth/me"):
                    return self._send(200, {"user": {"id": "u-new", "email": "x@y.z"}})
                already = (self.headers.get("Authorization") or "") == "Bearer tok-login"
                return self._send(200, {"isFollowing": already, "following": already})
            return self._send(401, {"success": False, "error": "Unauthorized"})

        def do_POST(self):
            ctype = self.headers.get("Content-Type") or ""
            if "json" in ctype:
                body = self._body()
            else:
                n = int(self.headers.get("Content-Length") or 0)
                raw = self.rfile.read(n) if n else b""
                body = {"_multipart": True, "_len": len(raw), "_jpeg": b"\xff\xd8\xff" in raw, "_profiles": b"profiles" in raw}
            self._record(body)
            p = self.path
            if p == "/api/auth/customer/quick-signup":
                if (body or {}).get("email", "").lower() in (TAKEN, SETUP, APPLE):
                    return self._send(409, {"success": False, "code": "EMAIL_EXISTS", "message": "That email already has an Outsyde account."})
                return self._send(200, {"success": True, "user": {"id": "u-new", "email": (body or {}).get("email", "").lower()},
                                        "accessToken": "tok-new", "refreshToken": "r", "expiresIn": 604800, "referralApplied": False})
            if p == "/api/auth/mobile/login":
                ident = (body or {}).get("identifier", "").lower()
                if ident == SETUP:
                    return self._send(401, {"success": False, "error": {"code": "ACCOUNT_NEEDS_SETUP", "message": "We emailed you a 6-digit code to finish setting up your account.", "email": SETUP}})
                if ident == APPLE:
                    return self._send(401, {"success": False, "error": {"code": "OAUTH_ONLY", "message": "This account uses Apple sign-in. Please continue with Apple."}})
                if (body or {}).get("password") == GOOD_PASS:
                    return self._send(200, {"user": {"isVendor": False}, "accessToken": "tok-login"})
                return self._send(401, {"success": False, "error": {"message": "Invalid email/username or password.", "code": "INVALID_CREDENTIALS"}})
            if p == "/api/media/upload-image":
                if not self._authed():
                    return self._send(401, {"error": "Unauthorized"})
                if STATE["uploadFail"]:
                    return self._send(500, {"error": "upload failed"})
                return self._send(200, {"url": "https://cdn.example.com/profiles/p.jpg"})
            if p.startswith("/api/events/") and p.endswith("/rsvp"):
                if not self._authed():
                    return self._send(401, {"success": False, "code": "NO_AUTH", "error": "Sign in first."})
                return self._send(201, {"success": True, "order": {"id": "ord-1", "status": "completed"}})
            if p == "/api/follows":
                return self._send(200 if self._authed() else 401, {"success": self._authed()})
            if p.startswith("/api/events/") and p.endswith("/checkout"):
                return self._send(503, {"success": False, "code": "CHECKOUT_CLOSED", "error": "Ticket sales are closed right now."})
            return self._send(404, {"error": "stub: no route"})

        def do_PATCH(self):
            body = self._body()
            self._record(body)
            if self.path == "/api/users/me" and self._authed():
                return self._send(200, {"success": True, "user": {"profileImageUrl": (body or {}).get("profileImageUrl")}})
            return self._send(401, {"error": "Unauthorized"})

        def log_message(self, *a):
            pass

    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()


if "--stub" in sys.argv:
    run_stub(int(sys.argv[sys.argv.index("--stub") + 1]))
    sys.exit(0)

import urllib.request
from playwright.sync_api import sync_playwright

WEB = os.environ.get("WEB", "http://localhost:3108")
STUB = os.environ.get("STUB", "http://127.0.0.1:5098")
SHOTS = os.environ.get("SHOTS")
PHOTO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures-quick-photo.png")


def use_crop(pg):
    """Photo ratios 3b: a picked photo opens the 1:1 crop box first; take it as it opens."""
    pg.locator("[data-testid=crop-modal]").wait_for(timeout=10000)
    pg.locator("[data-testid=crop-done]:not([disabled])").click(timeout=10000)
    pg.locator("[data-testid=crop-modal]").wait_for(state="detached", timeout=10000)
passed = failed = 0


def check(ok, name, extra=""):
    global passed, failed
    if ok:
        passed += 1
        print("  ok  ", name)
    else:
        failed += 1
        print("  FAIL", name, extra)


def stub_log():
    return json.loads(urllib.request.urlopen(f"{STUB}/__log").read())


def reset(upload_fail=False):
    urllib.request.urlopen(f"{STUB}/__reset{'?uploadFail=1' if upload_fail else ''}").read()


def calls(path_pred, method=None):
    return [c for c in stub_log() if path_pred(c["p"]) and (method is None or c["m"] == method)]


def make_photo():
    # A real image so the browser can decode it (built with the standard library: zlib + PNG chunks).
    import struct, zlib
    w = h = 8
    raw = b"".join(b"\x00" + bytes([232, 185, 48]) * w for _ in range(h))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
    with open(PHOTO, "wb") as f:
        f.write(png)


def open_page(b, slug, width=390):
    c = b.new_context(viewport={"width": width, "height": 844}, color_scheme="dark")
    c.route("**/fonts.googleapis.com/**", lambda r: r.abort())
    c.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    c.route("**/js.stripe.com/**", lambda r: r.abort())
    pg = c.new_page()
    navs = []
    pg.on("framenavigated", lambda f: navs.append(f.url) if f == pg.main_frame else None)
    pg.goto(f"{WEB}/e/{slug}")
    pg.wait_for_selector("h1.ev-title", timeout=90000)
    pg.wait_for_timeout(900)
    return c, pg, navs


def sheet(pg):
    return pg.locator("[data-testid=quick-auth-sheet]")


def fill_signup(pg, email="maya@email.com", phone="(516) 555 0142", password="secret1", first="Maya"):
    pg.fill("#qa-first", first)
    pg.fill("#qa-email", email)
    pg.fill("#qa-phone", phone)
    pg.fill("#qa-pass", password)


make_photo()
with sync_playwright() as pw:
    b = pw.chromium.launch()

    print("signed out Get tickets opens sheet, no navigation to /login")
    reset()
    c, pg, navs = open_page(b, PAID)
    pg.click(".ev-cta")
    pg.wait_for_selector("[data-testid=quick-auth-sheet]", timeout=15000)
    pg.wait_for_timeout(500)
    check(sheet(pg).count() == 1 and sheet(pg).is_visible(), "sheet opens")
    check(not any("/login" in u for u in navs), "no navigation to /login", navs)
    check(pg.locator("#qa-title").inner_text() == "Get your tickets", "title from mockup 42", pg.locator("#qa-title").inner_text())
    check(pg.evaluate("document.activeElement && document.activeElement.id") == "qa-first", "focus on first field")
    check(sheet(pg).get_attribute("role") == "dialog" and sheet(pg).get_attribute("aria-modal") == "true", "dialog with aria-modal")
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.screenshot(path=os.path.join(SHOTS, "42-signup.png"))
    print("Escape closes the sheet and nothing is sent")
    fill_signup(pg)
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    check(sheet(pg).count() == 0, "Escape closes the sheet")
    check(len(calls(lambda p: p.startswith("/api/auth/"), "POST")) == 0, "nothing is sent", calls(lambda p: p.startswith("/api/auth/"), "POST"))
    c.close()

    print("form rules show before any request")
    reset()
    c, pg, navs = open_page(b, PAID)
    pg.click(".ev-cta")
    fill_signup(pg, phone="555 0142", password="12345")
    pg.click(".qa-cta")
    pg.wait_for_timeout(300)
    txt = sheet(pg).inner_text()
    check("Enter a phone number with at least 10 digits." in txt and "Use at least 6 characters." in txt, "phone and password copy", txt)
    check(len(calls(lambda p: p == "/api/auth/customer/quick-signup")) == 0, "no request with bad fields")
    c.close()

    print("sign up with photo: upload then profile patch then checkout opens")
    reset()
    c, pg, navs = open_page(b, PAID)
    pg.click(".ev-cta")
    pg.set_input_files("#qa-photo", PHOTO)
    use_crop(pg)
    pg.wait_for_timeout(300)
    check("Change photo" in sheet(pg).inner_text(), "photo picked shows Change photo")
    if SHOTS:
        pg.screenshot(path=os.path.join(SHOTS, "42-signup-photo.png"))
    fill_signup(pg)
    pg.click(".qa-cta")
    pg.wait_for_selector("[aria-label='Ticket checkout']", timeout=15000)
    log = stub_log()
    order = [c2["p"] for c2 in log if c2["m"] in ("POST", "PATCH") and c2["p"] in ("/api/auth/customer/quick-signup", "/api/media/upload-image", "/api/users/me")]
    check(order == ["/api/auth/customer/quick-signup", "/api/media/upload-image", "/api/users/me"], "sign up, then upload, then profile patch", order)
    qs = [x for x in log if x["p"] == "/api/auth/customer/quick-signup"]
    check(len(qs) == 1 and sorted((qs[0]["body"] or {}).keys()) == ["email", "firstName", "password", "phone"], "only the four fields are sent", qs)
    up = [x for x in log if x["p"] == "/api/media/upload-image"]
    check(len(up) == 1 and up[0]["auth"] == "Bearer tok-new", "upload uses the new account", up)
    check(len(up) == 1 and up[0]["body"].get("_jpeg") and up[0]["body"].get("_profiles"), "upload is a re-encoded JPEG in the profiles folder", up)
    pt = [x for x in log if x["p"] == "/api/users/me"]
    check(len(pt) == 1 and (pt[0]["body"] or {}).get("profileImageUrl") == "https://cdn.example.com/profiles/p.jpg", "profile patch sends the uploaded url", pt)
    check(f"checkout={TT_PAID}" in pg.url, "checkout opens for the chosen ticket", pg.url)
    check(not any("/login" in u for u in navs), "never sent to /login", navs)
    cookies = {x["name"]: x for x in c.cookies()}
    check(cookies.get("outsyde_access_token", {}).get("httpOnly") is True and cookies["outsyde_access_token"]["value"] == "tok-new", "signed in with an HttpOnly cookie")
    c.close()

    print("photo failure does not block checkout")
    reset(upload_fail=True)
    c, pg, navs = open_page(b, PAID)
    pg.click(".ev-cta")
    pg.set_input_files("#qa-photo", PHOTO)
    use_crop(pg)
    fill_signup(pg, email="photofail@email.com")
    pg.click(".qa-cta")
    pg.wait_for_selector("text=We couldn't add your photo. You can add it later in your account.", timeout=10000)
    check(True, "photo note shown")
    pg.wait_for_selector("[aria-label='Ticket checkout']", timeout=15000)
    check(f"checkout={TT_PAID}" in pg.url, "checkout still opens", pg.url)
    check(len(calls(lambda p: p == "/api/users/me", "PATCH")) == 0, "no profile patch after a failed upload")
    c.close()

    print("existing email switches to log in with email kept")
    reset()
    c, pg, navs = open_page(b, PAID)
    pg.click(".ev-cta")
    fill_signup(pg, email=TAKEN)
    pg.click(".qa-cta")
    pg.wait_for_selector("text=Welcome back", timeout=10000)
    txt = sheet(pg).inner_text()
    check("That email already has an Outsyde account. Log in to get your tickets." in txt, "mockup 43 note", txt)
    check("Email already registered" not in txt, "never the raw backend text")
    check(pg.input_value("#qa-email") == TAKEN, "email kept", pg.input_value("#qa-email"))
    check(pg.input_value("#qa-pass") == "", "password cleared")
    check(pg.locator("#qa-phone").count() == 0 and pg.locator("#qa-first").count() == 0, "log in mode shows only email and password")
    check(pg.evaluate("document.activeElement && document.activeElement.id") == "qa-pass", "focus moves to the password")
    fp = pg.locator("a", has_text="Forgot password?")
    check(fp.count() == 1 and fp.get_attribute("href") == "/forgot-password" and fp.get_attribute("target") == "_blank", "Forgot password opens in a new tab")
    if SHOTS:
        pg.screenshot(path=os.path.join(SHOTS, "43-has-account.png"))

    print("wrong password shows the mismatch line")
    pg.fill("#qa-pass", "nope")
    pg.click(".qa-cta")
    pg.wait_for_selector("text=That password doesn't match. Try again or reset it.", timeout=10000)
    check(pg.locator("#qa-pass").get_attribute("aria-invalid") == "true", "password field marked invalid")
    if SHOTS:
        pg.screenshot(path=os.path.join(SHOTS, "43-wrong.png"))
    pg.fill("#qa-pass", GOOD_PASS)
    pg.click(".qa-cta")
    pg.wait_for_selector("[aria-label='Ticket checkout']", timeout=15000)
    check(f"checkout={TT_PAID}" in pg.url, "log in then checkout opens", pg.url)
    c.close()

    print("log in then RSVP completes with one rsvp request")
    reset()
    c, pg, navs = open_page(b, FREE)
    pg.click(".ev-cta")
    pg.wait_for_timeout(400)
    check(sheet(pg).count() == 1, "no follow id still opens the sheet")
    check(not any("/login" in u for u in navs), "no follow id: no jump to /login", navs)
    pg.click("text=Already have an account? Log in")
    pg.fill("#qa-email", "maya@email.com")
    pg.fill("#qa-pass", GOOD_PASS)
    pg.click(".qa-cta")
    pg.wait_for_selector("[data-testid=going-app]", timeout=15000)
    rs = calls(lambda p: p.endswith("/rsvp"), "POST")
    check(len(rs) == 1 and rs[0]["auth"] == "Bearer tok-login", "exactly one rsvp request, signed in", rs)
    check(len(rs) == 1 and (rs[0]["body"] or {}).get("ticketTypeId") == TT_FREE and isinstance((rs[0]["body"] or {}).get("idempotencyKey"), str), "rsvp carries the type and an idempotency key", rs)
    ga = pg.locator("[data-testid=going-app]").inner_text()
    check("App Store" in ga and "Google Play" in ga, "done shows app buttons", ga)
    check("the password you just made" not in ga, "no sign in line after a log in", ga)
    check(pg.locator("[data-testid=get-the-app]").count() == 0, "the general app card is not shown twice")
    c.close()

    print("done shows the sign in line only after a new account")
    reset()
    c, pg, navs = open_page(b, FREE)
    pg.click(".ev-cta")
    fill_signup(pg, email="newbie@email.com")
    pg.click(".qa-cta")
    pg.wait_for_selector("[data-testid=going-app]", timeout=15000)
    ga = pg.locator("[data-testid=going-app]").inner_text()
    check("Sign in with newbie@email.com and the password you just made. Your tickets are already there." in ga, "sign in line names the new email", ga)
    links = pg.locator("[data-testid=going-app] a")
    hrefs = [links.nth(i).get_attribute("href") for i in range(links.count())]
    check("https://apps.apple.com/app/outsyde/id6738926870" in hrefs and "https://play.google.com/store/apps/details?id=com.outsyde.app" in hrefs, "store links", hrefs)
    check(len(calls(lambda p: p.endswith("/rsvp"), "POST")) == 1, "one rsvp after sign up")
    if SHOTS:
        pg.locator("[data-testid=going-app]").scroll_into_view_if_needed()
        pg.screenshot(path=os.path.join(SHOTS, "44-done.png"))
    horiz = pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    check(horiz, "no sideways scroll at 390 px")
    c.close()

    print("double tap sends one sign up")
    reset()
    c, pg, navs = open_page(b, FREE)
    pg.click(".ev-cta")
    fill_signup(pg, email="double@email.com")
    pg.evaluate("() => { const b = document.querySelector('.qa-cta'); b.click(); b.click(); b.click(); }")
    pg.wait_for_selector("[data-testid=going-app]", timeout=15000)
    pg.wait_for_timeout(500)
    check(len(calls(lambda p: p == "/api/auth/customer/quick-signup")) == 1, "one sign up request", len(calls(lambda p: p == "/api/auth/customer/quick-signup")))
    check(len(calls(lambda p: p.endswith("/rsvp"), "POST")) == 1, "one rsvp request")
    c.close()

    print("signed out Follow opens the sheet, then follows")
    reset()
    c, pg, navs = open_page(b, PAID)
    pg.click("button.ev-btn-outline:has-text('Follow')")
    pg.wait_for_timeout(400)
    check(sheet(pg).count() == 1 and pg.locator("#qa-title").inner_text() == "Join Outsyde", "follow opens the sheet", sheet(pg).count())
    check(not any("/login" in u for u in navs), "follow: no jump to /login", navs)
    fill_signup(pg, email="follower@email.com")
    pg.click(".qa-cta")
    pg.wait_for_selector("button.ev-btn-outline:has-text('Following')", timeout=15000)
    check(len(calls(lambda p: p == "/api/follows", "POST")) == 1, "one follow request")
    c.close()

    print("tap before the signed in probe answers still opens the sheet")
    reset()
    c = b.new_context(viewport={"width": 390, "height": 844})
    import time as _t
    def slow_follow(route):
        _t.sleep(4)
        route.continue_()
    c.route("**/api/account/follow/**", slow_follow)
    pg = c.new_page()
    navs = []
    pg.on("framenavigated", lambda f: navs.append(f.url) if f == pg.main_frame else None)
    pg.goto(f"{WEB}/e/{PAID}")
    pg.wait_for_selector(".ev-cta", timeout=90000)
    pg.click(".ev-cta")
    pg.wait_for_selector("[data-testid=quick-auth-sheet]", timeout=15000)
    check(not any("/login" in u for u in navs), "early tap: sheet, not /login", navs)
    c.close()

    print("passwordless account goes to finish setup with the return path")
    reset()
    c, pg, navs = open_page(b, PAID)
    pg.click(".ev-cta")
    pg.wait_for_selector("[data-testid=quick-auth-sheet]", timeout=15000)
    fill_signup(pg, email=SETUP)
    pg.click(".qa-cta")
    pg.wait_for_selector("text=Welcome back", timeout=10000)
    pg.fill("#qa-pass", "anything")
    pg.click(".qa-cta")
    pg.wait_for_url("**/claim**", timeout=15000)
    from urllib.parse import urlparse, parse_qs
    q = parse_qs(urlparse(pg.url).query)
    check(q.get("sent") == ["1"] and q.get("email") == [SETUP], "claim with sent=1 and the email", pg.url)
    check(q.get("return") == [f"/e/{PAID}?checkout={TT_PAID}&qty=1"], "claim keeps the checkout as the return path", q.get("return"))
    c.close()

    print("Apple only account shows its own line and a log in link")
    reset()
    c, pg, navs = open_page(b, PAID)
    pg.click(".ev-cta")
    pg.wait_for_selector("[data-testid=quick-auth-sheet]", timeout=15000)
    pg.click("text=Already have an account? Log in")
    pg.fill("#qa-email", APPLE)
    pg.fill("#qa-pass", "anything")
    pg.click(".qa-cta")
    pg.wait_for_selector("text=This account uses Apple sign-in. Please continue with Apple.", timeout=10000)
    txt = sheet(pg).inner_text()
    check("That password doesn't match" not in txt, "not the wrong password line", txt)
    lk = sheet(pg).locator("a", has_text="Go to log in")
    check(lk.count() == 1 and (lk.get_attribute("href") or "").startswith("/login?return="), "log in page link with return", lk.get_attribute("href") if lk.count() else None)
    c.close()

    print("after log in, the page refreshes the signed in details")
    reset()
    c, pg, navs = open_page(b, PAID)
    check(pg.locator("button.ev-btn-outline:has-text('Follow')").count() == 1, "signed out shows Follow")
    pg.click(".ev-cta")
    pg.wait_for_selector("[data-testid=quick-auth-sheet]", timeout=15000)
    pg.click("text=Already have an account? Log in")
    pg.fill("#qa-email", "maya@email.com")
    pg.fill("#qa-pass", GOOD_PASS)
    pg.click(".qa-cta")
    pg.wait_for_selector("[aria-label='Ticket checkout']", timeout=15000)
    pg.wait_for_selector("button.ev-btn-outline:has-text('Following')", state="attached", timeout=15000)
    check(True, "an account that already follows now shows Following")
    slugs = [x for x in stub_log() if x["p"].startswith("/api/follows/check/") and x["auth"] == "Bearer tok-login"]
    check(len(slugs) >= 1, "follow state checked again with the new token", len(slugs))
    c.close()

    print("follow when already following does not send a second follow")
    reset()
    c, pg, navs = open_page(b, PAID)
    pg.click("button.ev-btn-outline:has-text('Follow')")
    pg.wait_for_selector("[data-testid=quick-auth-sheet]", timeout=15000)
    pg.click("text=Already have an account? Log in")
    pg.fill("#qa-email", "maya@email.com")
    pg.fill("#qa-pass", GOOD_PASS)
    pg.click(".qa-cta")
    pg.wait_for_selector("button.ev-btn-outline:has-text('Following')", timeout=15000)
    pg.wait_for_timeout(500)
    check(len(calls(lambda p: p == "/api/follows", "POST")) == 0, "no follow POST for someone already following", len(calls(lambda p: p == "/api/follows", "POST")))
    c.close()

    print("keyboard: focus stays in the sheet, Escape returns focus, page does not scroll")
    reset()
    c, pg, navs = open_page(b, PAID)
    pg.focus(".ev-cta")
    pg.keyboard.press("Enter")
    pg.wait_for_selector("[data-testid=quick-auth-sheet]", timeout=15000)
    check(pg.evaluate("getComputedStyle(document.body).overflow") == "hidden", "page behind does not scroll")
    inside = True
    for _ in range(14):
        pg.keyboard.press("Tab")
        if not pg.evaluate("!!document.activeElement.closest('[data-testid=quick-auth-sheet]')"):
            inside = False
    check(inside, "Tab never leaves the sheet")
    inside = True
    for _ in range(14):
        pg.keyboard.press("Shift+Tab")
        if not pg.evaluate("!!document.activeElement.closest('[data-testid=quick-auth-sheet]')"):
            inside = False
    check(inside, "Shift+Tab never leaves the sheet")
    pg.keyboard.press("Escape")
    pg.wait_for_timeout(300)
    check(sheet(pg).count() == 0, "Escape closes")
    check(pg.evaluate("document.activeElement && document.activeElement.classList.contains('ev-cta')"), "focus back on Get tickets")
    check(pg.evaluate("getComputedStyle(document.body).overflow") != "hidden", "page scroll restored")
    c.close()

    print("follow purpose: existing email note says follow")
    reset()
    c, pg, navs = open_page(b, PAID)
    pg.click("button.ev-btn-outline:has-text('Follow')")
    pg.wait_for_selector("[data-testid=quick-auth-sheet]", timeout=15000)
    fill_signup(pg, email=TAKEN)
    pg.click(".qa-cta")
    pg.wait_for_selector("text=That email already has an Outsyde account. Log in to follow.", timeout=10000)
    check(True, "follow note")
    c.close()

    print("desktop width")
    reset()
    c, pg, navs = open_page(b, PAID, width=1280)
    pg.click(".ev-cta")
    bb = sheet(pg).bounding_box()
    check(bb is not None and bb["width"] <= 520.5, "sheet capped at 520 px on desktop", bb)
    c.close()
    b.close()

try:
    os.remove(PHOTO)
except OSError:
    pass
print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
