"""
Browser checks for the Event team screens (p4-team step 8): the host's team page with a person's times, pay, stay
longer, To be discussed and taking off with a reason; messages; the member's own page (accept a request, notes from the
host, what they'll get); the co-host's view and Your events; the team pay card on Manage. LOCAL ONLY.
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

P = "et" + format(int(time.time()), "x")
def mkuser(slug, first):
    return sql(f"INSERT INTO users (id,email,name,first_name,username,is_active) VALUES (gen_random_uuid(),'{P}-{slug}@test.local','{first} Lastname','{first}','{P}{slug}',true) RETURNING id").splitlines()[0]

host = mkuser("host", "Hana"); sec = mkuser("sec", "Marcus"); dj = mkuser("dj", "Nova"); co = mkuser("co", "Ray"); kim = mkuser("kim", "Kim")
users = [host, sec, dj, co, kim]
title = f"{P} Rooftop"
eid = sql(f"""INSERT INTO events (host_user_id, slug, title, status, starts_at, ends_at, timezone, published_at, venue_name)
  VALUES ('{host}', '{P}-roof', '{title}', 'published', now() - interval '1 hour', now() + interval '4 hours', 'America/New_York', now() - interval '5 days', 'The Loft') RETURNING id""").splitlines()[0]
def member(u, role):
    sql(f"""INSERT INTO event_door_members (event_id, member_user_id, added_by_user_id, role, cohost_level, invited_at, accepted_at)
      VALUES ('{eid}', '{u}', '{host}', '{role}', {"'team'" if role == "cohost" else "NULL"}, now() - interval '3 days', now() - interval '2 days')""")
member(sec, "security"); member(dj, "entertainment"); member(co, "cohost")
sql(f"INSERT INTO event_door_members (event_id, member_user_id, added_by_user_id, role, invited_at) VALUES ('{eid}', '{kim}', '{host}', 'media', now())")
sql(f"INSERT INTO event_team_pay (event_id, member_user_id, role, pay_type, fixed_cents, updated_by_user_id) VALUES ('{eid}', '{sec}', 'security', 'fixed', 16000, '{host}')")
sql(f"INSERT INTO event_team_pay (event_id, member_user_id, role, pay_type, hourly_cents, updated_by_user_id) VALUES ('{eid}', '{dj}', 'entertainment', 'hourly', 5000, '{host}')")
sql(f"""INSERT INTO event_team_schedules (event_id, member_user_id, role, starts_at, ends_at, call_at, updated_by_user_id)
  VALUES ('{eid}', '{sec}', 'security', now() - interval '1 hour', now() + interval '2 hours', now() - interval '90 minutes', '{host}'),
         ('{eid}', '{dj}', 'entertainment', now() - interval '30 minutes', now() + interval '90 minutes', NULL, '{host}')""")
team_url = f"{WEB}/events/{eid}/team"

try:
    ht, st, djt, cot, kimt = (tok(u) for u in users)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        print("host: the team page")
        ctx, pg, errs = new_ctx(browser, ht)
        pg.goto(team_url)
        pg.locator("[data-testid=team-section]").first.wait_for(timeout=20000)
        titles = pg.locator("[data-testid=team-section] h2").all_inner_texts()
        check(titles == ["CO-HOST", "SECURITY", "ENTERTAINMENT", "MEDIA"], "sections by role, co-hosts first", titles)
        marcus = pg.locator("[data-testid=team-row]", has_text="Marcus")
        check(re.search(r"Call \d{1,2}:\d{2} (AM|PM) · Fixed \$160", marcus.inner_text()) is not None and "On the team" in marcus.inner_text(), "Marcus: call time and pay", marcus.inner_text())
        check("$50 an hour" in pg.locator("[data-testid=team-row]", has_text="Nova").inner_text(), "Nova: hourly")
        check("Team" in pg.locator("[data-testid=team-row]", has_text="Ray").inner_text(), "Ray: co-host level")
        tot = pg.locator("[data-testid=team-totals]")
        check("Team pay" in tot.inner_text() and "Not covered" in tot.inner_text(), "team pay totals: no ticket earnings, not covered", tot.inner_text())

        marcus.click()
        panel = pg.locator("[data-testid=person-panel]")
        panel.wait_for(timeout=10000)
        check(panel.get_by_role("radio", name="Fixed", exact=True).get_attribute("aria-checked") == "true", "pay shows Fixed")
        panel.get_by_label("Fixed amount").fill("170")
        panel.get_by_role("button", name="Save pay").click()
        panel.get_by_text("Pay saved. Marcus gets a push.").wait_for(timeout=10000)
        check(sql(f"SELECT fixed_cents FROM event_team_pay WHERE event_id='{eid}' AND member_user_id='{sec}'") == "17000", "DB: pay $170")
        panel.locator("#t-place").fill("Side door on 5th")
        panel.locator("#t-note").fill("Wear all black.")
        panel.get_by_role("button", name="Save times").click()
        panel.get_by_text("Times saved.").wait_for(timeout=10000)
        check(sql(f"SELECT place_note || '|' || host_note FROM event_team_schedules WHERE event_id='{eid}' AND member_user_id='{sec}'") == "Side door on 5th|Wear all black.", "DB: where to go and note")
        check([c.inner_text() for c in panel.get_by_role("radiogroup", name="Extra pay").get_by_role("radio").all()] == ["Fixed amount", "No extra pay", "To be discussed"], "stay longer pay choices (not hourly)")
        panel.get_by_role("radio", name="1 hour").click()
        panel.get_by_label("Extra amount").fill("50")
        panel.get_by_role("button", name="Ask Marcus to stay").click()
        panel.get_by_text(re.compile(r"Sent\. Marcus has until \d{1,2}:\d{2} (AM|PM) to answer\.")).wait_for(timeout=10000)
        req = panel.locator("[data-testid=stay-request]")
        req.first.wait_for(timeout=10000)
        check(re.search(r"Until \d{1,2}:\d{2} (AM|PM), \$50\.00 extra\.", req.first.inner_text()) is not None and "Waiting for an answer" in req.first.inner_text(), "the open request shows", req.first.inner_text())
        check(panel.get_by_role("button", name="Ask Marcus to stay").count() == 0, "one open request at a time")
        check(sql(f"SELECT status || '|' || fixed_cents FROM event_team_extensions WHERE event_id='{eid}' AND member_user_id='{sec}'") == "open|5000", "DB: request open, $50")
        check(no_overflow(pg), f"{WIDTH}px: team page with a panel has no horizontal overflow")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/team-panel-{WIDTH}.png", full_page=True)
        panel.get_by_role("button", name="Close").click()

        # Nova is hourly: their rate is the default, never a Fixed amount
        pg.locator("[data-testid=team-row]", has_text="Nova").click()
        panel = pg.locator("[data-testid=person-panel]")
        panel.wait_for(timeout=10000)
        choices = [c.inner_text() for c in panel.get_by_role("radiogroup", name="Extra pay").get_by_role("radio").all()]
        check(choices == ["At their hourly rate", "No extra pay", "To be discussed"] and panel.get_by_role("radio", name="At their hourly rate").get_attribute("aria-checked") == "true", "hourly: their rate first and picked", choices)
        panel.get_by_role("radio", name="To be discussed").click()
        panel.get_by_role("radio", name="30 min").click()
        panel.get_by_role("button", name="Ask Nova to stay").click()
        panel.locator("[data-testid=stay-request]").first.wait_for(timeout=10000)
        panel.get_by_role("button", name="Close").click()

        # messages
        msgs = pg.locator("[data-testid=team-messages]")
        msgs.get_by_label("Send to").select_option(label="All Security")
        msgs.get_by_label("Message").fill("Radio check at 9:15.")
        msgs.get_by_role("button", name="Send").click()
        msgs.get_by_text("Sent. They get a push and see it on their event page.").wait_for(timeout=10000)
        msgs.locator("[data-testid=sent-message]").first.wait_for(timeout=10000)
        check("All Security · 1 person" in msgs.locator("[data-testid=sent-message]").first.inner_text(), "sent list", msgs.inner_text())
        check(no_dash(pg), "no dashes on the host's page")
        check(real(errs) == [], "no console or page errors (host)", errs)
        ctx.close()

        print("member: their page")
        ctx, pg, errs = new_ctx(browser, st)
        pg.goto(WEB + "/events/door")
        row = pg.locator("[data-testid=door-row]", has_text=title)
        row.wait_for(timeout=20000)
        check("Security" in row.inner_text() and row.get_by_role("link", name="Scan").count() == 0, "Security: no scanner", row.inner_text())
        row.get_by_role("link", name="Open").click()
        pg.locator("[data-testid=my-team]").wait_for(timeout=20000)
        ask = pg.locator("[data-testid=stay-ask]")
        check("asked you to stay 1 more hour" in ask.inner_text() and re.search(r"Until \d{1,2}:\d{2} (AM|PM), \$50\.00 extra\.", ask.inner_text()) is not None, "the request card (screen 56)", ask.inner_text())
        role = pg.locator("[data-testid=my-role]")
        check("SECURITY" in role.inner_text() and "Call time" in role.inner_text() and "Side door on 5th" in role.inner_text() and "Wear all black." in role.inner_text(), "their role, call time, where to go, note", role.inner_text())
        check("Radio check at 9:15." in pg.locator("[data-testid=from-host]").inner_text(), "message from the host")
        check(pg.locator("[data-testid=setup-needed]").count() == 1, "payout setup needed (paid spot, no account)")
        mine = pg.locator("[data-testid=my-pay]").inner_text()
        check("Fixed" in mine and "$170" in mine and "Paid 3 days after the event due to processing." in mine, "what they'll get before accepting", mine)
        if SHOTS: pg.screenshot(path=f"{SHOTS}/my-team-ask-{WIDTH}.png", full_page=True)
        ask.get_by_role("button", name="Accept").click()
        pg.get_by_text("Accepted. Your end time and pay are updated.").wait_for(timeout=10000)
        pg.wait_for_function("!document.querySelector('[data-testid=stay-ask]')", timeout=10000)
        role = pg.locator("[data-testid=my-role]")
        check(re.search(r"Until \d{1,2}:\d{2} (AM|PM), you accepted 1 more hour", role.inner_text()) is not None, "screen 51: until, you accepted 1 more hour", role.inner_text())
        mine = pg.locator("[data-testid=my-pay]").inner_text()
        check("Stayed 1 more hour" in mine and "$50" in mine and "$220" in mine, "$170 + $50 = $220", mine)
        check(sql(f"SELECT status FROM event_team_extensions WHERE event_id='{eid}' AND member_user_id='{sec}'") == "accepted", "DB: accepted")
        check(no_overflow(pg), f"{WIDTH}px: their page has no horizontal overflow")
        check(no_dash(pg), "no dashes on their page")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/my-team-{WIDTH}.png", full_page=True)
        check(real(errs) == [], "no console or page errors (member)", errs)
        ctx.close()

        # Nova accepts the To be discussed request (API), the host enters the amount
        rid = sql(f"SELECT id FROM event_team_extensions WHERE event_id='{eid}' AND member_user_id='{dj}'")
        check(api("POST", f"/api/events/{eid}/team/me/stay-longer/{rid}/accept", djt).get("success") is True, "Nova accepts (to be discussed)")

        print("host: after the answers")
        ctx, pg, errs = new_ctx(browser, ht)
        pg.goto(team_url)
        pg.locator("[data-testid=team-row]", has_text="Nova").click()
        panel = pg.locator("[data-testid=person-panel]")
        panel.wait_for(timeout=10000)
        check("Accepted 30 more minutes" in panel.inner_text() and "extra pay to be discussed" in panel.inner_text(), "accepted, to be discussed", panel.inner_text())
        panel.get_by_label("Amount for staying").fill("40")
        panel.get_by_role("button", name="Save", exact=True).click()
        panel.get_by_text("Saved. Nova gets $40.00 for staying.").wait_for(timeout=10000)
        check(sql(f"SELECT final_cents FROM event_team_extensions WHERE id='{rid}'") == "4000", "DB: $40 entered")
        panel.get_by_role("button", name="Close").click()
        pg.locator("[data-testid=team-row]", has_text="Marcus").click()
        panel = pg.locator("[data-testid=person-panel]")
        panel.wait_for(timeout=10000)
        panel.get_by_role("radio", name="Hourly", exact=True).click()
        panel.get_by_label("Hourly rate").fill("30")
        panel.get_by_role("button", name="Save pay").click()
        panel.get_by_text("They were asked to stay longer on this pay, so it can't switch between hourly and other pay now.").wait_for(timeout=10000)
        check(True, "can't switch to hourly after they agreed (backend message shown)")
        panel.get_by_role("button", name="Take off the team").click()
        conf = panel.get_by_role("group", name="Confirm")
        check("Take Marcus off this event's team?" in conf.inner_text() and "They had pay, so they see the reason you pick." in conf.inner_text(), "take off asks why", conf.inner_text())
        conf.get_by_role("button", name="Yes, take them off").click()
        conf.get_by_text("Choose why you're taking them off.").wait_for(timeout=10000)
        check(sql(f"SELECT count(*) FROM event_door_members WHERE event_id='{eid}' AND member_user_id='{sec}' AND removed_at IS NULL") == "1", "not removed without a reason")
        conf.get_by_role("radio", name="Late").click()
        conf.get_by_role("button", name="Yes, take them off").click()
        pg.get_by_text("Marcus is off the team.").wait_for(timeout=10000)
        check(sql(f"SELECT removal_reason FROM event_door_members WHERE event_id='{eid}' AND member_user_id='{sec}'") == "late", "DB: removed, reason Late")
        check(real(errs) == [], "no console or page errors (host again)", errs)

        print("host: Manage shows team pay")
        pg.goto(f"{WEB}/events/{eid}/manage")
        card = pg.locator("[data-testid=team-pay]")
        card.wait_for(timeout=20000)
        check("Event team pay" in card.inner_text() and "Outsyde pays the team $0" in card.inner_text(), "team pay card (not covered: no ticket earnings)", card.inner_text())
        check(pg.get_by_role("link", name="Event team").count() == 1, "Manage links to Event team")
        check(real(errs) == [], "no console or page errors (manage)", errs)
        ctx.close()

        print("a Media invite from the email link (review C1)")
        ctx, pg, errs = new_ctx(browser, kimt)
        pg.goto(WEB + "/events/door")
        inv = pg.locator("[data-testid=door-invite]")
        inv.first.wait_for(timeout=20000)
        check("invited you to be Media" in inv.first.inner_text(), "the Media invite shows", inv.first.inner_text())
        inv.first.get_by_role("button", name="Accept").click()
        pg.get_by_text("You're on the Event team. The event is in your list below.").wait_for(timeout=10000)
        row = pg.locator("[data-testid=door-row]", has_text=title)
        row.wait_for(timeout=10000)
        check("Media" in row.inner_text() and row.get_by_role("link", name="Open").count() == 1, "accepted: listed as Media with their page", row.inner_text())
        check(sql(f"SELECT accepted_at IS NOT NULL FROM event_door_members WHERE event_id='{eid}' AND member_user_id='{kim}'") == "t", "DB: accepted")
        row.get_by_role("link", name="Open").click()
        pg.get_by_role("button", name="Leave as Media").click()
        pg.get_by_role("group", name="Confirm leave").get_by_role("button", name="Yes, leave").click()
        pg.get_by_text("YOU LEFT").wait_for(timeout=10000)
        check(sql(f"SELECT removed_by_user_id FROM event_door_members WHERE event_id='{eid}' AND member_user_id='{kim}'") == kim, "left as Media, and told so")
        check(real([e for e in errs if "404" not in e]) == [], "no console or page errors (Media)", errs)
        ctx.close()

        print("co-host")
        ctx, pg, errs = new_ctx(browser, cot)
        pg.goto(WEB + "/events/mine")
        grp = pg.locator("[data-testid=group-cohosting]")
        grp.wait_for(timeout=20000)
        check(title in grp.inner_text(), "Your events: Co-hosting", grp.inner_text())
        grp.get_by_text(title).click()
        pg.wait_for_url(f"**/events/{eid}/manage", timeout=20000)
        pg.locator("[data-testid=status]").wait_for(timeout=20000)
        check(pg.get_by_role("link", name="Edit").count() == 0 and pg.get_by_role("button", name="Cancel event").count() == 0
              and pg.get_by_role("button", name="Refund").count() == 0, "Team co-host: no Edit, Cancel event or Refund on Manage (review I2)")
        pg.goto(team_url)
        pg.locator("[data-testid=team-row]", has_text="Nova").click()
        panel = pg.locator("[data-testid=person-panel]")
        panel.wait_for(timeout=10000)
        check(panel.locator("[data-testid=panel-times]").count() == 1 and panel.locator("[data-testid=panel-pay]").count() == 0
              and panel.get_by_role("button", name=re.compile("^Ask ")).count() == 0, "co-host: times, no pay, no stay longer")
        check(pg.get_by_role("radio", name="Co-host").count() == 0 and pg.get_by_role("radio", name="All my events").count() == 0, "co-host invites for this event only, never co-hosts")
        check(real(errs) == [], "no console or page errors (co-host)", errs)
        ctx.close()
        browser.close()
except Exception:
    import traceback; traceback.print_exc(); failed += 1
finally:
    for q in [f"DELETE FROM event_team_extensions WHERE event_id='{eid}'",
              f"DELETE FROM event_team_message_recipients WHERE team_message_id IN (SELECT id FROM event_team_messages WHERE event_id='{eid}')",
              f"DELETE FROM event_team_messages WHERE event_id='{eid}'", f"DELETE FROM event_team_message_senders WHERE event_id='{eid}'",
              f"DELETE FROM event_team_schedules WHERE event_id='{eid}'", f"DELETE FROM event_team_pay WHERE event_id='{eid}'",
              f"DELETE FROM event_team_setup_notices WHERE event_id='{eid}'", f"DELETE FROM event_door_members WHERE event_id='{eid}'",
              f"DELETE FROM notifications WHERE user_id IN ({','.join(repr(u) for u in users)})",
              f"DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE participant1_id IN ({','.join(repr(u) for u in users)}) OR participant2_id IN ({','.join(repr(u) for u in users)}))",
              f"DELETE FROM conversations WHERE participant1_id IN ({','.join(repr(u) for u in users)}) OR participant2_id IN ({','.join(repr(u) for u in users)})",
              f"DELETE FROM event_promoter_links WHERE event_id='{eid}'", f"DELETE FROM events WHERE id='{eid}'", f"DELETE FROM users WHERE id IN ({','.join(repr(u) for u in users)})"]:
        try: sql(q)
        except Exception as e: print("cleanup:", str(e)[:200])
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
