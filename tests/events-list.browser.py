"""
Browser checks for /events (Playwright for Python, Chromium). LOCAL ONLY.
Run: python3 tests/events-list.browser.py
Env (defaults shown): EL_WEB_URL=http://localhost:3101  EL_BACKEND_URL=http://localhost:5071
  EL_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde_test  EL_BACKEND_DIR=/home/claude/outsyde-backend
  EL_SHOTS=<dir for screenshots>  (optional)
Skips (exit 0) when the web or backend server is not up. Needs psql and node on PATH.
Seeds one published free event through the local backend (create, free ticket type, accept the host
agreement, publish) and removes everything it created.
"""
import re, json, os, subprocess, sys, time, urllib.request
from urllib.parse import urlparse

WEB = os.environ.get("EL_WEB_URL", "http://localhost:3101")
BACKEND = os.environ.get("EL_BACKEND_URL", "http://localhost:5071")
PG = os.environ.get("EL_PG_URL", "postgresql://outsyde:outsyde@localhost:5432/outsyde_test")
BDIR = os.environ.get("EL_BACKEND_DIR", "/home/claude/outsyde-backend")
SHOTS = os.environ.get("EL_SHOTS")

for u in (WEB, BACKEND, PG):
    if urlparse(u).hostname not in ("localhost", "127.0.0.1", "::1"):
        sys.exit("refusing to run: all URLs must be localhost")

def up(u):
    try:
        urllib.request.urlopen(u, timeout=3); return True
    except Exception as e:
        return hasattr(e, "code")
if not (up(WEB + "/events") and up(BACKEND + "/api/events")):
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
    code = f'console.log(require("jsonwebtoken").sign({{userId:"{uid}",isVendor:false}},"test",{{expiresIn:"1h"}}))'
    return subprocess.run(["node", "-e", code], capture_output=True, text=True, cwd=BDIR, check=True).stdout.strip()

def api(method, path, token=None, body=None):
    h = {"Content-Type": "application/json"}
    if token: h["Authorization"] = "Bearer " + token
    rq = urllib.request.Request(BACKEND + path, method=method, headers=h, data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(rq) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        return json.loads(e.read() or b"{}")

P = "el" + format(int(time.time()), "x")
def iso(days, hours=0):
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + days * 86400 + hours * 3600))

def real(errs):
    return [e for e in errs if not e.startswith("Failed to load resource") and "/_vercel/insights/" not in e]

def new_ctx(browser, token, width):
    ctx = browser.new_context(viewport={"width": width, "height": 900})
    if token:
        ctx.add_cookies([{"name": "outsyde_access_token", "value": token, "url": WEB}])
    ctx.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
    pg = ctx.new_page()
    errs = []
    pg.on("response", lambda r: errs.append(f"{r.status} {r.url}") if r.status == 404 and "/events/new" not in r.url else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    return ctx, pg, errs

host = sql(f"INSERT INTO users (id,email,name,first_name,username) VALUES (gen_random_uuid(),'{P}-host@test.local','Host Lastname','Host','{P}host') RETURNING id").splitlines()[0]
# Every host needs payouts set up to publish, free events too (backend 2026-10-26).
sql(f"INSERT INTO user_payout_accounts (user_id, stripe_account_id, onboarding_complete) VALUES ('{host}', 'acct_{P}_host', true)")
try:
    ht = tok(host)
    title = f"{P} Listed Night"
    ev = api("POST", "/api/events", ht, {"title": title, "startsAt": iso(10), "endsAt": iso(10, 4), "timezone": "America/New_York",
            "venueName": "The Hall", "addressLine1": "12 Main St", "city": "Freeport", "state": "NY", "postalCode": "11520", "capacity": 30})["event"]
    api("POST", f"/api/events/{ev['id']}/ticket-types", ht, {"name": "Free RSVP", "priceCents": 0, "quantity": 10})
    ag = api("GET", "/api/events/host-agreement", ht)["agreement"]
    api("POST", "/api/events/host-agreement/accept", ht, {"version": ag["version"]})
    pub = api("POST", f"/api/events/{ev['id']}/publish", ht)
    check(pub.get("success") is True, "seeded event is published", pub)

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for width in (375, 1280):
            print(f"signed out ({width}px)")
            ctx, pg, errs = new_ctx(browser, None, width)
            pg.goto(WEB + "/events")
            # The seeded card may sit past the first page on a busy database, so use the title filter-free list and Load more.
            link = pg.locator(f"a[href='/e/{ev['slug']}']")
            pg.locator(".ev-card").first.wait_for(timeout=60000)
            for _ in range(10):
                if link.count() or not pg.get_by_role("button", name="Load more").count():
                    break
                pg.get_by_role("button", name="Load more").click()
                pg.wait_for_timeout(500)
            link.first.wait_for(timeout=15000)
            check(link.count() == 1, "published event card links to /e/<slug>", link.count())
            card = link.first
            check(title in card.inner_text(), "card shows the title")
            check("Free RSVP" in card.inner_text(), "card shows the free RSVP price", card.inner_text())
            check("12 Main St" not in pg.content(), "no street address on the page")
            check(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"{width}px: no horizontal overflow")
            check(pg.get_by_role("link", name="My Tickets").get_attribute("href") == "/tickets", "My Tickets links to /tickets")
            check(pg.get_by_role("link", name="Your events").count() == 0, "signed out: no Your events link")
            check(pg.get_by_role("link", name="Event team").count() == 0, "signed out: no Event team link")
            if SHOTS: pg.screenshot(path=f"{SHOTS}/events-{width}.png", full_page=True)
            if width == 1280:
                pg.get_by_role("button", name="Free").click()
                pg.locator(f"a[href='/e/{ev['slug']}']").first.wait_for(timeout=15000)
                check(pg.get_by_role("button", name="Free").get_attribute("aria-pressed") == "true", "Free chip turns on and the free event stays")
                pg.locator("a[href^='/login'][href*='events']").wait_for(timeout=15000)
                pg.get_by_role("link", name="Host an event").click()
                pg.wait_for_url("**/login**", timeout=15000)
                check(urlparse(pg.url).path == "/login" and re.search(r"return=(%2F|/)events(%2F|/)new", pg.url) is not None, "Host an event signed out goes to /login?return=/events/new", pg.url)
            check(real(errs) == [], "no console or page errors", errs)
            ctx.close()

        print("signed in (1280px)")
        ctx, pg, errs = new_ctx(browser, ht, 1280)
        pg.goto(WEB + "/events")
        pg.get_by_role("link", name="Your events").wait_for(timeout=15000)
        check(pg.get_by_role("link", name="Your events").get_attribute("href") == "/events/mine", "signed in: Your events links to /events/mine")
        check(pg.get_by_role("link", name="Host an event").get_attribute("href") == "/events/new", "signed in: Host an event links to /events/new")
        check(pg.get_by_role("link", name="Event team").get_attribute("href") == "/events/door", "signed in: Event team links to /events/door")
        ctx.close()
        ctx, pg, errs = new_ctx(browser, ht, 360)
        pg.goto(WEB + "/events")
        pg.get_by_role("link", name="Event team").wait_for(timeout=15000)
        check(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "360px signed in: no horizontal overflow with the extra link")
        ctx.close()
        browser.close()
finally:
    ev_ids = f"SELECT id FROM events WHERE host_user_id='{host}'"
    for stmt in (
        f"DELETE FROM ticket_types WHERE event_id IN ({ev_ids})",
        f"DELETE FROM events WHERE host_user_id='{host}'",
        f"DELETE FROM host_agreement_acceptances WHERE user_id='{host}'",
        f"DELETE FROM user_payout_accounts WHERE user_id='{host}'",
        f"DELETE FROM users WHERE id='{host}'",
    ):
        try:
            sql(stmt)
        except Exception as e:
            print("  cleanup failed:", str(e)[:200])

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
