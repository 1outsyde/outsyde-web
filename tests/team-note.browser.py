"""
Browser checks for the Event Team note on goutsyde.com (p4-team step 9d-2, calls 79 to 85, backend #403) at phone width:
an invite with pay shows the note and one "Accept and join" (joins, then saves the note); an invite without pay shows
plain Accept; the link page signed in does the same; signed out, the note shows right after joining with its own
I accept; their event page shows the note until accepted and "Set up payouts" only for payout setup. LOCAL ONLY.
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

P = "tn" + format(int(time.time()), "x")
def mkuser(slug, first):
    return sql(f"INSERT INTO users (id,email,name,first_name,username,is_active) VALUES (gen_random_uuid(),'{P}-{slug}@test.local','{first} Lastname','{first}','{P}{slug}',true) RETURNING id").splitlines()[0]
def accepted_note(uid):
    return sql(f"SELECT count(*) FROM event_team_note_acceptances WHERE user_id = '{uid}'") == "1"

host = mkuser("host", "Jordan")
paid = mkuser("paid", "Ana")
free = mkuser("free", "Bo")
linky = mkuser("linky", "Cy")
ev = sql(f"INSERT INTO events (host_user_id, slug, title, status, starts_at, ends_at, timezone, published_at) VALUES ('{host}', '{P}-roof', '{P} Rooftop', 'published', now() + interval '2 days', now() + interval '50 hours', 'America/New_York', now()) RETURNING id").splitlines()[0]
for uid, role in ((paid, "security"), (free, "media")):
    sql(f"INSERT INTO event_door_members (event_id, member_user_id, added_by_user_id, role, invited_at) VALUES ('{ev}', '{uid}', '{host}', '{role}', now())")
sql(f"INSERT INTO event_team_pay (event_id, member_user_id, role, pay_type, fixed_cents, updated_by_user_id) VALUES ('{ev}', '{paid}', 'security', 'fixed', 16000, '{host}')")
H = tok(host)
def mklink(role, pay):
    body = {"scope": "event", "role": role}
    if pay: body["pay"] = {"payType": "fixed", "fixedCents": 12000}
    r = api("POST", f"/api/events/{ev}/team/links", H, body)
    return r["link"]["code"]
NEW_EMAIL = f"{P}-new@test.local"

with sync_playwright() as p:
    b = p.chromium.launch()
    try:
        print("invite list: an invite with pay")
        ctx, pg, errs = new_ctx(b, tok(paid))
        pg.goto(f"{WEB}/events/door")
        pg.get_by_test_id("door-invite").first.wait_for()
        card = pg.get_by_test_id("invite-note")
        card.wait_for()
        txt = card.inner_text()
        check("EVENT TEAM NOTE" in txt and "payout day" in txt and "employer" in txt and "tax forms" in txt, "the note shows on the paid invite", txt[:300])
        check(card.locator("li").count() == 6, "six points")
        check(pg.get_by_test_id("invite-accept").inner_text() == "Accept and join", "one Accept and join")
        check(no_overflow(pg) and no_dash(pg), "no sideways scroll, no dashes")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/note-invite.png", full_page=True)
        pg.get_by_test_id("invite-accept").click()
        pg.get_by_text(re.compile("You're on the Event team")).wait_for()
        joined = sql(f"SELECT (accepted_at IS NOT NULL)::text FROM event_door_members WHERE event_id = '{ev}' AND member_user_id = '{paid}'")
        check(joined == "true" and accepted_note(paid), "joined, then the note saved", (joined, accepted_note(paid)))
        rec = sql(f"SELECT user_agent FROM event_team_note_acceptances WHERE user_id = '{paid}'")
        check("Mozilla" in rec or "Chrome" in rec or "Headless" in rec, "the browser is on the record", rec)
        check(real(errs) == [], "no page errors", real(errs))

        print("their event page after accepting")
        pg.goto(f"{WEB}/events/{ev}/my-team")
        pg.get_by_test_id("my-team").wait_for()
        check(pg.get_by_test_id("my-note").count() == 0, "accepted: no note card")
        check(pg.get_by_test_id("setup-needed").count() == 1, "payouts not set up: the Set up payouts line stays")
        ctx.close()

        print("invite list: an invite without pay")
        ctx, pg, errs = new_ctx(b, tok(free))
        pg.goto(f"{WEB}/events/door")
        pg.get_by_test_id("door-invite").first.wait_for()
        check(pg.get_by_test_id("invite-note").count() == 0 and pg.get_by_test_id("invite-accept").inner_text() == "Accept", "no pay: no note, plain Accept")
        ctx.close()

        print("link page signed in, link with pay")
        code = mklink("entertainment", True)
        ctx, pg, errs = new_ctx(b, tok(linky))
        pg.goto(f"{WEB}/team/{code}")
        pg.get_by_test_id("team-link").wait_for()
        pg.get_by_test_id("link-note").wait_for()
        check(pg.get_by_test_id("link-accept").inner_text() == "Accept and join", "note above Accept and join")
        check(no_overflow(pg) and no_dash(pg), "no sideways scroll, no dashes on the link page")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/note-link.png", full_page=True)
        pg.get_by_test_id("link-accept").click()
        pg.locator('[data-state="yours"]').wait_for(timeout=20000)
        check(accepted_note(linky) and pg.get_by_test_id("link-note").count() == 0, "joined and the note saved, no card after", accepted_note(linky))
        check(real(errs) == [], "no page errors", real(errs))
        ctx.close()

        print("link page signed out: the note after joining")
        code2 = mklink("security", True)
        ctx2 = b.new_context(viewport={"width": WIDTH, "height": 860})
        ctx2.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
        pg2 = ctx2.new_page()
        errs2 = []
        pg2.on("pageerror", lambda e: errs2.append(str(e)))
        pg2.goto(f"{WEB}/team/{code2}")
        pg2.get_by_test_id("team-link").wait_for()
        check(pg2.get_by_test_id("link-note").count() == 0 and pg2.get_by_test_id("link-accept").inner_text() == "Accept", "signed out: no note yet, plain Accept")
        pg2.get_by_test_id("link-accept").click()
        sheet = pg2.get_by_role("dialog")
        sheet.wait_for()
        sheet.get_by_label(re.compile("First name", re.I)).fill("Newbie")
        sheet.get_by_label(re.compile("^Email", re.I)).fill(NEW_EMAIL)
        sheet.get_by_label(re.compile("Phone", re.I)).fill("5165550177")
        sheet.get_by_label(re.compile("Password", re.I)).fill("secret123")
        sheet.get_by_role("button", name="Create account and accept").click()
        pg2.locator('[data-state="yours"]').wait_for(timeout=20000)
        new_id = sql(f"SELECT id FROM users WHERE email = '{NEW_EMAIL}'")
        check(not accepted_note(new_id), "never accepted for them before they saw it")
        note2 = pg2.get_by_test_id("link-note")
        note2.wait_for()
        check(note2.get_by_test_id("link-note-accept").inner_text() == "I accept", "the note shows after joining with I accept")
        if SHOTS: pg2.screenshot(path=f"{SHOTS}/note-after-join.png", full_page=True)
        note2.get_by_test_id("link-note-accept").click()
        pg2.wait_for_function("!document.querySelector('[data-testid=link-note]')", timeout=10000)
        check(accepted_note(new_id), "accepted after reading it")
        check(no_overflow(pg2) and no_dash(pg2), "no sideways scroll, no dashes")
        check(real(errs2) == [], "no page errors", real(errs2))
        ctx2.close()

        print("their event page: note waiting (accepted by link without the note)")
        late = mkuser("late", "Di")
        sql(f"INSERT INTO event_door_members (event_id, member_user_id, added_by_user_id, role, invited_at, accepted_at) VALUES ('{ev}', '{late}', '{host}', 'media', now(), now())")
        sql(f"INSERT INTO event_team_pay (event_id, member_user_id, role, pay_type, fixed_cents, updated_by_user_id) VALUES ('{ev}', '{late}', 'media', 'fixed', 9000, '{host}')")
        sql(f"INSERT INTO user_payout_accounts (user_id, stripe_account_id, onboarding_complete) VALUES ('{late}', 'acct_{P}late', true)")
        ctx, pg, errs = new_ctx(b, tok(late))
        pg.goto(f"{WEB}/events/{ev}/my-team")
        pg.get_by_test_id("my-team").wait_for()
        pg.get_by_test_id("my-note").wait_for()
        check(pg.get_by_test_id("setup-needed").count() == 0, "payouts set up: no Set up payouts line, only the note")
        check(no_overflow(pg) and no_dash(pg), "no sideways scroll, no dashes on their page")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/note-mypage.png", full_page=True)
        pg.get_by_test_id("my-note-accept").click()
        pg.get_by_text("Thanks. You've accepted the Event Team note.").wait_for()
        check(accepted_note(late) and pg.get_by_test_id("my-note").count() == 0, "accepted from their page, card gone")
        check(real(errs) == [], "no page errors", real(errs))
        ctx.close()
    finally:
        b.close()
        sql(f"DELETE FROM event_team_note_acceptances WHERE user_id IN (SELECT id FROM users WHERE email LIKE '{P}-%')")
        sql(f"DELETE FROM user_payout_accounts WHERE user_id IN (SELECT id FROM users WHERE email LIKE '{P}-%')")
        sql(f"DELETE FROM event_team_setup_notices WHERE event_id = '{ev}'")
        sql(f"DELETE FROM event_team_pay WHERE event_id = '{ev}'")
        sql(f"DELETE FROM event_door_members WHERE event_id = '{ev}'")
        sql(f"DELETE FROM event_team_links WHERE event_id = '{ev}'")
        sql(f"DELETE FROM events WHERE id = '{ev}'")

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
