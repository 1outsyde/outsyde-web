"""
Browser checks for the Discover tab row and the Navbar Discover link (Playwright for Python, Chromium). LOCAL ONLY.
Run: python3 tests/discover-tabs.browser.py
Env (defaults shown): DT_WEB_URL=http://localhost:3101
  DT_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde_test  DT_BACKEND_DIR=/home/claude/1outsyde/outsyde-backend
Skips (exit 0) when the web server is not up. Needs psql and node on PATH.
All four tab pages must exist: /events, /discover/following, /discover and /discover/pulse.
"""
import re, os, subprocess, sys, time, urllib.request
from urllib.parse import urlparse

WEB = os.environ.get("DT_WEB_URL", "http://localhost:3101")
PG = os.environ.get("DT_PG_URL", "postgresql://outsyde:outsyde@localhost:5432/outsyde_test")
BDIR = os.environ.get("DT_BACKEND_DIR", "/home/claude/1outsyde/outsyde-backend")

for u in (WEB, PG):
    if urlparse(u).hostname not in ("localhost", "127.0.0.1", "::1"):
        sys.exit("refusing to run: all URLs must be localhost")

def up(u):
    try:
        urllib.request.urlopen(u, timeout=3); return True
    except Exception as e:
        return hasattr(e, "code")
if not up(WEB + "/events"):
    print("skipped: web server is not up"); sys.exit(0)
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

TABS = [("Events", "/events", "events"), ("Following", "/discover/following", "following"),
        ("Pro", "/discover", "pro"), ("Pulse", "/discover/pulse", "pulse")]
P = "dt" + format(int(time.time()), "x")

def new_ctx(browser, token, width):
    ctx = browser.new_context(viewport={"width": width, "height": 900})
    if token:
        ctx.add_cookies([{"name": "outsyde_access_token", "value": token, "url": WEB}])
    ctx.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
    return ctx, ctx.new_page()

uid = sql(f"INSERT INTO users (id,email,name,username) VALUES (gen_random_uuid(),'{P}@test.local','Tab Tester','{P}u') RETURNING id").splitlines()[0]
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx, pg = new_ctx(browser, None, 1280)
        for label, path, key in TABS:
            print(f"tab row on {path}")
            resp = pg.goto(WEB + path)
            check(resp is not None and resp.status == 200, f"{path}: returns 200", resp and resp.status)
            nav = pg.get_by_role("navigation", name="Discover")
            nav.wait_for(timeout=60000)
            links = nav.get_by_role("link")
            check(links.count() == 4, f"{path}: 4 links", links.count())
            check([links.nth(i).inner_text().strip() for i in range(links.count())] == [t[0] for t in TABS], f"{path}: order Events, Following, Pro, Pulse")
            check([links.nth(i).get_attribute("href") for i in range(links.count())] == [t[1] for t in TABS], f"{path}: hrefs")
            cur = [t[0] for i, t in enumerate(TABS) if links.nth(i).get_attribute("aria-current") == "page"]
            check(cur == [label], f"{path}: only {label} has aria-current=page", cur)
            check(links.nth(0).locator("svg").count() == 1, f"{path}: Events tab has the ticket icon")
            h = nav.get_by_role("link").nth(0).bounding_box()["height"]
            check(abs(h - 48) < 1, f"{path}: tab is 48px tall", h)
        ctx.close()

        print("390px overflow")
        ctx, pg = new_ctx(browser, None, 390)
        for label, path, key in TABS:
            resp = pg.goto(WEB + path)
            check(resp is not None and resp.status == 200, f"{path}: returns 200 (390px)", resp and resp.status)
            pg.get_by_role("navigation", name="Discover").wait_for(timeout=60000)
            check(pg.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), f"{path}: no horizontal scroll at 390px")
        ctx.close()

        print("navbar, signed out")
        ctx, pg = new_ctx(browser, None, 1280)
        pg.goto(WEB + "/events")
        l = pg.get_by_role("link", name="Discover", exact=True)
        l.first.wait_for(timeout=60000)
        check(l.first.get_attribute("href") == "/discover", "signed out: Discover links to /discover", l.first.get_attribute("href"))
        ctx.close()

        print("navbar, signed in consumer")
        ctx, pg = new_ctx(browser, tok(uid), 1280)
        pg.goto(WEB + "/events")
        pg.get_by_role("link", name="My Activity").wait_for(timeout=60000)
        l = pg.get_by_role("link", name="Discover", exact=True)
        check(l.first.get_attribute("href") == "/discover", "consumer: Discover links to /discover", l.count())
        ctx.close()
        browser.close()
finally:
    try:
        sql(f"DELETE FROM users WHERE id='{uid}'")
    except Exception as e:
        print("  cleanup failed:", str(e)[:200])

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
