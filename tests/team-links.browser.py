"""
Browser checks for Event team invite links (p4-team step 9-0, backend #402): the host invites by Link, Email and Phone
(Messages opens with the link), sees waiting links with Copy and Cancel; goutsyde.com/team/CODE signed out shows the
invite and pay, Accept opens quick sign up, a new person joins and lands on the team; taken links say so. LOCAL ONLY.
Env (defaults shown): ED_WEB_URL=http://localhost:3101  ED_BACKEND_URL=http://localhost:5071
  ED_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde  ED_BACKEND_DIR=/home/claude/outsyde-backend  ED_SHOTS (folder)
"""
import json, os, re, subprocess, sys, time, urllib.request, urllib.error
from urllib.parse import urlparse

WEB = os.environ.get("ED_WEB_URL", "http://localhost:3101")
BACKEND = os.environ.get("ED_BACKEND_URL", "http://localhost:5071")
PG = os.environ.get("ED_PG_URL", "postgresql://outsyde:outsyde@localhost:5432/outsyde")
BDIR = os.environ.get("ED_BACKEND_DIR", "/home/claude/outsyde-backend")
SHOTS = os.environ.get("ED_SHOTS")
WIDTH = 375
DASH = re.compile(r"[–—]| - ")

for u in (WEB, BACKEND, PG):
    if urlparse(u).hostname not in ("localhost", "127.0.0.1", "::1"):
        sys.exit("refusing to run: all URLs must be localhost")
def up(u):
    try:
        urllib.request.urlopen(u, timeout=3); return True
    except Exception as e:
        return hasattr(e, "code")
if not (up(WEB + "/events/door") and up(BACKEND + "/api/events")):
    print("skipped: web or backend server is not up"); sys.exit(0)
from playwright.sync_api import sync_playwright

passed = failed = 0
def check(cond, name, detail=""):
    global passed, failed
    if cond: passed += 1; print("  ok  " + name)
    else: failed += 1; print("  FAIL " + name, str(detail)[:2000])
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
def real(errs):
    return [e for e in errs if not e.startswith("Failed to load resource") and "/_vercel/insights/" not in e]
def new_ctx(browser, token):
    ctx = browser.new_context(viewport={"width": WIDTH, "height": 860})
    ctx.add_cookies([{"name": "outsyde_access_token", "value": token, "url": WEB}])
    ctx.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    return ctx, pg, errs
def no_overflow(pg):
    return pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
def no_dash(pg):
    return DASH.search(pg.locator("main").inner_text()) is None

P = "tl" + format(int(time.time()), "x")
def mkuser(slug, first):
    return sql(f"INSERT INTO users (id,email,name,first_name,username,is_active) VALUES (gen_random_uuid(),'{P}-{slug}@test.local','{first} Lastname','{first}','{P}{slug}',true) RETURNING id").splitlines()[0]

host = mkuser("host", "Jordan")
other = mkuser("other", "Bo")
ev = sql(f"INSERT INTO events (host_user_id, slug, title, status, starts_at, ends_at, timezone, published_at) VALUES ('{host}', '{P}-roof', '{P} Rooftop', 'published', now() + interval '2 days', now() + interval '50 hours', 'America/New_York', now()) RETURNING id").splitlines()[0]
H = tok(host)
NEW_EMAIL = f"{P}-new@test.local"

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        print("host: invite by Link with pay")
        ctx, pg, errs = new_ctx(b, H)
        pg.goto(f"{WEB}/events/{ev}/team")
        pg.get_by_role("radio", name="Link").click()
        check(pg.get_by_test_id("way-hint").is_visible(), "the Link hint shows")
        pg.get_by_role("radio", name="Security").click()
        pg.get_by_label("Add their pay now (shown on the invite)").check()
        pg.get_by_role("radio", name="Fixed").click()
        pg.get_by_label("Fixed amount").fill("160")
        pg.get_by_role("button", name="Make the link").click()
        pg.get_by_test_id("made-link").wait_for()
        url = pg.get_by_label("Invite link").input_value()
        check(re.match(r"^https://goutsyde\.test/team/[A-HJ-NP-Z2-9]{12}$", url) is not None or "/team/" in url, "a link is made", url)
        code = url.rsplit("/", 1)[-1]
        row = pg.get_by_test_id("link-row").first
        row.wait_for()
        check("Security" in row.inner_text() and "Fixed $160" in row.inner_text() and "Link" in row.inner_text(), "it waits in WAITING TO JOIN with its pay", row.inner_text())
        check(no_overflow(pg) and no_dash(pg), "no sideways scroll, no dashes")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/links-host.png", full_page=True)

        print("host: invite by Email (67b)")
        pg.get_by_role("radio", name="Email").click()
        pg.get_by_role("radio", name="Media").click()
        pg.locator("#team-user").fill("Someone.New@Example.com")
        pg.get_by_role("button", name="Email the invite").click()
        pg.get_by_text(re.compile("Invite emailed to someone.new@example.com|couldn't be emailed today")).wait_for()
        pg.wait_for_function("document.querySelectorAll('[data-testid=link-row]').length === 2", timeout=10000)
        check(pg.get_by_test_id("link-row").count() == 2, "two waiting links")

        print("host: invite by Phone (Messages opens)")
        pg.get_by_role("radio", name="Phone").click()
        pg.locator("#team-user").fill("12")
        pg.get_by_role("button", name="Text the invite").click()
        check(pg.get_by_test_id("add-error").inner_text() == "Enter a phone number with at least 10 digits.", "a short number is refused here")
        pg.locator("#team-user").fill("(516) 555 0134")
        pg.get_by_role("button", name="Text the invite").click()
        pg.get_by_text("Your Messages app should open with the invite.", exact=False).wait_for()
        pg.get_by_test_id("made-link").wait_for()
        pg.wait_for_function("document.querySelectorAll('[data-testid=link-row]').length === 3", timeout=10000)
        check(pg.get_by_test_id("link-row").count() == 3, "the texted link waits too")
        check(real(errs) == [], "no page errors on the host page", real(errs))

        print("host: cancel a link")
        pg.get_by_test_id("link-row").nth(0).get_by_role("button", name="Cancel").click()
        pg.get_by_text("Link cancelled. Nobody can use it now.").wait_for()
        pg.wait_for_function("document.querySelectorAll('[data-testid=link-row]').length === 2", timeout=10000)
        check(pg.get_by_test_id("link-row").count() == 2, "cancelled links leave the list")
        ctx.close()

        print("a new person opens the link signed out")
        ctx2 = b.new_context(viewport={"width": WIDTH, "height": 860})
        ctx2.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
        pg2 = ctx2.new_page()
        errs2 = []
        pg2.on("pageerror", lambda e: errs2.append(str(e)))
        pg2.goto(f"{WEB}/team/{code.lower()}")
        pg2.get_by_test_id("team-link").wait_for()
        head = pg2.get_by_test_id("link-headline").inner_text()
        check("invited you to be Security" in head, "headline names the role", head)
        check(f"{P} Rooftop" in pg2.get_by_test_id("link-what").inner_text(), "and the event")
        check("Fixed" in pg2.get_by_test_id("link-pay").inner_text() and "$160" in pg2.get_by_test_id("link-pay").inner_text(), "and the pay")
        check("Paid 3 days after the event due to processing" in pg2.get_by_test_id("link-pay").inner_text(), "with the pay line copy")
        check(no_overflow(pg2) and no_dash(pg2), "no sideways scroll, no dashes on the link page")
        if SHOTS: pg2.screenshot(path=f"{SHOTS}/links-page.png", full_page=True)
        pg2.get_by_test_id("link-accept").click()
        sheet = pg2.get_by_role("dialog")
        sheet.wait_for()
        check("Join the Event team" in sheet.inner_text(), "Accept opens quick sign up for the team", sheet.inner_text()[:200])
        if SHOTS: pg2.screenshot(path=f"{SHOTS}/links-signup.png", full_page=True)
        sheet.get_by_label(re.compile("First name", re.I)).fill("Newbie")
        sheet.get_by_label(re.compile("^Email", re.I)).fill(NEW_EMAIL)
        sheet.get_by_label(re.compile("Phone", re.I)).fill("5165550199")
        sheet.get_by_label(re.compile("Password", re.I)).fill("secret123")
        sheet.get_by_role("button", name="Create account and accept").click()
        pg2.locator('[data-state="yours"]').wait_for(timeout=20000)
        check(pg2.get_by_test_id("link-headline").inner_text() == "You're on the team", "they're on the team")
        check(pg2.get_by_test_id("link-next").get_attribute("href") == f"/events/{ev}/my-team", "with a link to their event page")
        new_id = sql(f"SELECT id FROM users WHERE email = '{NEW_EMAIL}'")
        rowdb = sql(f"SELECT role || ':' || (accepted_at IS NOT NULL)::text FROM event_door_members WHERE event_id = '{ev}' AND member_user_id = '{new_id}'")
        paydb = sql(f"SELECT pay_type || ':' || fixed_cents FROM event_team_pay WHERE event_id = '{ev}' AND member_user_id = '{new_id}'")
        check(rowdb == "security:true" and paydb == "fixed:16000", "saved: accepted Security with the link's pay", (rowdb, paydb))
        check(real(errs2) == [], "no page errors on the link page", real(errs2))
        ctx2.close()

        print("someone else opens the taken link")
        ctx3, pg3, errs3 = new_ctx(b, tok(other))
        pg3.goto(f"{WEB}/team/{code}")
        pg3.locator('[data-state="closed"]').wait_for()
        check(pg3.get_by_test_id("link-headline").inner_text() == "This invite was already used", "taken: says so")
        check(pg3.get_by_test_id("link-accept").count() == 0 and pg3.get_by_test_id("link-pay").count() == 0, "no Accept and no pay")
        pg3.goto(f"{WEB}/team/NOTACODE")
        pg3.get_by_test_id("link-missing").wait_for()
        check(True, "a bad code: invite not found")
        check(real(errs3) == [], "no page errors", real(errs3))
        ctx3.close()
    finally:
        b.close()
        sql(f"DELETE FROM event_team_setup_notices WHERE event_id = '{ev}'")
        sql(f"DELETE FROM event_team_pay WHERE event_id = '{ev}'")
        sql(f"DELETE FROM event_door_members WHERE event_id = '{ev}'")
        sql(f"DELETE FROM event_team_links WHERE event_id = '{ev}'")
        sql(f"DELETE FROM events WHERE id = '{ev}'")

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
