"""
Browser checks for /events/payouts and the Tickets links (Playwright for Python, Chromium). LOCAL ONLY.
Run: python3 tests/payouts-links.browser.py
Env (defaults shown): PL_WEB_URL=http://localhost:3100  PL_BACKEND_URL=http://localhost:5071
  PL_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde_test  PL_BACKEND_DIR=/home/claude/outsyde-backend
Skips (exit 0) when the web or backend server is not up. Needs psql and node on PATH.
Never reaches real Stripe: the page's navigation to a Stripe host is intercepted inside the browser.
"""
import re, json, os, subprocess, sys, time, urllib.request
from urllib.parse import urlparse

WEB = os.environ.get("PL_WEB_URL", "http://localhost:3100")
BACKEND = os.environ.get("PL_BACKEND_URL", "http://localhost:5071")
PG = os.environ.get("PL_PG_URL", "postgresql://outsyde:outsyde@localhost:5432/outsyde_test")
BDIR = os.environ.get("PL_BACKEND_DIR", "/home/claude/outsyde-backend")

for u in (WEB, BACKEND, PG):
    if urlparse(u).hostname not in ("localhost", "127.0.0.1", "::1"):
        sys.exit("refusing to run: all URLs must be localhost")

def up(u):
    try:
        urllib.request.urlopen(u, timeout=3); return True
    except Exception as e:
        return hasattr(e, "code")
if not (up(WEB + "/events/payouts") and up(BACKEND + "/api/events")):
    print("skipped: web or backend server is not up"); sys.exit(0)
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print("skipped: playwright for python not installed"); sys.exit(0)

passed = failed = 0
def check(cond, name, detail=""):
    global passed, failed
    if cond: passed += 1; print("  ok  " + name)
    else: failed += 1; print("  FAIL " + name, str(detail)[:400])

def sql(q):
    r = subprocess.run(["psql", PG, "-At", "-c", q], capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr)
    return r.stdout.strip()

def tok(uid):
    return subprocess.run(["node", "-e", f'console.log(require("jsonwebtoken").sign({{userId:"{uid}",isVendor:false}},"test",{{expiresIn:"1h"}}))'],
                          capture_output=True, text=True, cwd=BDIR, check=True).stdout.strip()

P = "pl" + format(int(time.time()), "x")
uid = sql(f"INSERT INTO users (id,email,name,first_name,username) VALUES (gen_random_uuid(),'{P}-u@test.local','Pay {P} Lastname','Pay','{P}u') RETURNING id").splitlines()[0]
token = tok(uid)

def real(errs):
    return [e for e in errs if not e.startswith("Failed to load resource") and "/_vercel/insights/" not in e]

def new_ctx(browser, tk, width):
    ctx = browser.new_context(viewport={"width": width, "height": 900})
    if tk:
        ctx.add_cookies([{"name": "outsyde_access_token", "value": tk, "url": WEB}])
    ctx.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    return ctx, pg, errs

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        print("signed out")
        ctx, pg, errs = new_ctx(browser, None, 390)
        pg.goto(WEB + "/events/payouts?stripe=done")
        pg.wait_for_url("**/login**", timeout=15000)
        check(urlparse(pg.url).path == "/login" and "return=%2Fevents%2Fpayouts%3Fstripe%3Ddone" in pg.url, "ends on /login with the return path and ?stripe=done kept", pg.url)
        ctx.close()

        print("signed in, no account (1280px)")
        ctx, pg, errs = new_ctx(browser, token, 1280)
        pg.goto(WEB + "/events/payouts")
        pg.get_by_role("heading", name="Set up payouts").wait_for(timeout=15000)
        check(pg.get_by_text("Connect a bank account through Stripe to get paid for ticket sales.").count() == 1, "no account: setup copy shows")
        btn = pg.get_by_role("button", name="Set up payouts")
        check(btn.count() == 1, "button reads Set up payouts")
        before = pg.url
        btn.click()
        pg.locator(".po-err").wait_for(timeout=15000)
        msg = pg.locator(".po-err").inner_text().strip()
        check(msg != "" and pg.url == before, "setup-link failure shows a message and does not navigate", {"msg": msg, "url": pg.url})
        check(not any(c in msg for c in ("–", "—")) and "%" not in msg, "message has no dashes or percentages", msg)
        check(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "1280px: no horizontal overflow")

        print("setup-link answers (mocked in the browser)")
        pg.route("**/api/events/payouts/setup-link", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"success": True, "url": "https://evil.example.com/x"})))
        pg.reload()
        pg.get_by_role("button", name="Set up payouts").click()
        pg.locator(".po-err").wait_for(timeout=15000)
        check(pg.locator(".po-err").inner_text().strip() == "Something went wrong. Try again." and urlparse(pg.url).hostname == "localhost", "non-Stripe url: generic error, no navigation", pg.url)
        pg.unroute("**/api/events/payouts/setup-link")
        pg.route("**/api/events/payouts/setup-link", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"success": True, "url": "http://connect.stripe.com/x"})))
        pg.reload()
        pg.get_by_role("button", name="Set up payouts").click()
        pg.locator(".po-err").wait_for(timeout=15000)
        check(urlparse(pg.url).hostname == "localhost", "http (not https) Stripe url: refused", pg.url)
        pg.unroute("**/api/events/payouts/setup-link")
        pg.route("**/api/events/payouts/setup-link", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"success": True, "url": "https://connect.stripe.com/setup/e/test"})))
        hits = []
        def stripe_nav(route):
            hits.append(route.request.url); route.fulfill(status=200, content_type="text/html", body="<title>stub</title>stripe stub")
        ctx.route("https://connect.stripe.com/**", stripe_nav)
        pg.reload()
        pg.get_by_role("button", name="Set up payouts").click()
        pg.wait_for_url("https://connect.stripe.com/**", timeout=15000)
        check(hits == ["https://connect.stripe.com/setup/e/test"], "https Stripe url: browser is sent there (intercepted, never leaves this machine)", hits)
        pg.goto(WEB + "/events/payouts")
        pg.unroute("**/api/events/payouts/setup-link")
        pg.route("**/api/events/payouts/status*", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"success": True, "hostType": "user", "hasAccount": True, "ready": False, "needsSetup": True})))
        pg.goto(WEB + "/events/payouts?stripe=done")
        pg.get_by_role("heading", name="Almost there").wait_for(timeout=15000)
        check(pg.get_by_text("Stripe still needs a few details before you can get paid.").count() == 1 and pg.get_by_role("button", name="Finish payout setup").count() == 1, "not ready with stripe=done: Almost there and Finish payout setup")
        pg.goto(WEB + "/events/payouts?stripe=refresh")
        pg.get_by_role("heading", name="Set up payouts").wait_for(timeout=15000)
        check(pg.get_by_role("button", name="Set up payouts").count() == 1, "stripe=refresh: Set up payouts")
        pg.unroute("**/api/events/payouts/status*")
        pg.route("**/api/events/payouts/status*", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"success": True, "hostType": "user", "hasAccount": True, "ready": True, "needsSetup": False})))
        pg.goto(WEB + "/events/payouts?stripe=done")
        pg.get_by_role("heading", name="Payouts are set up").wait_for(timeout=15000)
        check(pg.get_by_text("Ticket money is paid to your bank 3 days after your event ends.").count() == 1
              and pg.get_by_role("link", name="My tickets").get_attribute("href") == "/tickets"
              and pg.get_by_role("link", name="Back to home").get_attribute("href") == "/", "ready: heading, line, My tickets and home links")
        pg.unroute("**/api/events/payouts/status*")
        pg.route("**/api/events/payouts/status*", lambda r: r.fulfill(status=500, content_type="application/json", body=json.dumps({"success": False, "error": "boom"})))
        pg.goto(WEB + "/events/payouts")
        pg.get_by_role("button", name="Try again").wait_for(timeout=15000)
        check(pg.get_by_text("Something went wrong. Try again.").count() >= 1, "status error without a code: generic message and Try again")
        check(real(errs) == [], "no page errors", errs)
        ctx.close()

        print("Tickets link in the Navbar")
        ctx, pg, errs = new_ctx(browser, token, 1280)
        pg.goto(WEB + "/")
        pg.locator("nav a[href='/tickets']").first.wait_for(timeout=15000)
        link = pg.locator("nav a[href='/tickets']").first
        check(link.is_visible() and link.inner_text().strip() == "Tickets", "1280px: signed-in consumer sees a Tickets link")
        labels = pg.locator("nav a.on-link").all_inner_texts()
        check("My Activity" in labels and labels.index("Tickets") == labels.index("My Activity") + 1, "Tickets sits right after My Activity", labels)
        ctx.close()
        ctx, pg, errs = new_ctx(browser, token, 390)
        pg.goto(WEB + "/")
        pg.get_by_role("button", name="Toggle menu").click()
        d = pg.locator(".on-drawer a[href='/tickets']")
        d.wait_for(state="visible", timeout=15000)
        check(d.inner_text().strip() == "Tickets", "390px: mobile menu has Tickets")
        ctx.close()

        print("Account tab row")
        ctx, pg, errs = new_ctx(browser, token, 390)
        for path in ("/account", "/account/bookings", "/account/orders", "/account/points"):
            pg.goto(WEB + path)
            pg.locator("a.tab-link[href='/tickets']").wait_for(timeout=15000)
            tabs = pg.locator("a.tab-link").all_inner_texts()
            check(tabs.index("Tickets") == tabs.index("Orders") + 1, f"{path}: Tickets right after Orders", tabs)
        ctx.close()
        browser.close()
finally:
    try:
        sql(f"DELETE FROM notifications WHERE user_id='{uid}'")
    except Exception:
        pass
    try:
        sql(f"DELETE FROM users WHERE email LIKE '{P}-%'")
    except Exception as e:
        print("  cleanup failed:", str(e)[:200])

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
