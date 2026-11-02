"""
Browser checks for p5-safety on goutsyde.com (Legend's calls W1 to W12, 2026-11-01). Playwright for Python, Chromium. LOCAL ONLY.
Run: python3 tests/p5-safety.browser.py
Env (defaults shown): P5B_WEB_URL=http://localhost:3101  P5B_BACKEND_URL=http://localhost:5071
  P5B_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde_test  P5B_BACKEND_DIR=/home/claude/outsyde-backend
  P5B_SHOTS=<dir for screenshots> (optional)
Skips (exit 0) when the web or backend server is not up. Needs psql and node on PATH.

Seeds straight into SQL: the admin info@goutsyde.com (refuses to run if it exists), a personal host, a ticket holder,
a guest, a live event with a free RSVP the holder has, two pending reports on it, and a reported post. Removes
everything it created in finally. Covers: Money / Reports tabs (#reports), report cards and the reason box, Pause,
the Safety box and Trusted host switch, the on hold page for holder, host and guest, /tickets On hold, Release,
Report this event (sheet, validation, sent), the signed out sign in sheet for a report, and phone width overflow.
"""
import os, re, subprocess, sys, urllib.request
from urllib.parse import urlparse

WEB = os.environ.get("P5B_WEB_URL", "http://localhost:3101")
BACKEND = os.environ.get("P5B_BACKEND_URL", "http://localhost:5071")
PG = os.environ.get("P5B_PG_URL", "postgresql://outsyde:outsyde@localhost:5432/outsyde_test")
BDIR = os.environ.get("P5B_BACKEND_DIR", "/home/claude/outsyde-backend")
SHOTS = os.environ.get("P5B_SHOTS")
ADMIN_EMAIL = "info@goutsyde.com"

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
from playwright.sync_api import sync_playwright

passed = failed = 0
def check(cond, name, detail=""):
    global passed, failed
    if cond: passed += 1; print("  ok  " + name)
    else: failed += 1; print("  FAIL " + name, str(detail)[:400])

def sql(q):
    r = subprocess.run(["psql", PG, "-At", "-v", "ON_ERROR_STOP=1", "-c", q], capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr)
    return r.stdout.strip()
def one(q): return sql(q).splitlines()[0]
def tok(uid, is_admin=False):
    code = f'console.log(require("jsonwebtoken").sign({{userId:"{uid}",isVendor:false,isAdmin:{"true" if is_admin else "false"}}},"test",{{expiresIn:"1h"}}))'
    return subprocess.run(["node", "-e", code], capture_output=True, text=True, cwd=BDIR, check=True).stdout.strip()

def new_ctx(browser, token, width):
    ctx = browser.new_context(viewport={"width": width, "height": 900})
    if token: ctx.add_cookies([{"name": "outsyde_access_token", "value": token, "url": WEB}])
    ctx.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    return ctx, pg, errs

def overflow(pg):
    return pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")

def shot(pg, name):
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, name + ".png"), full_page=True)

if sql(f"SELECT count(*) FROM users WHERE lower(email)='{ADMIN_EMAIL}'") != "0":
    sys.exit(f"refusing to run: {ADMIN_EMAIL} already exists in this database")

P = "p5b" + format(int(__import__("time").time()), "x")
users, events, posts = [], [], []
def mk_user(s, admin=False):
    email = ADMIN_EMAIL if admin else f"{P}-{s}@test.local"
    uid = one(f"INSERT INTO users (id,email,name,first_name,username,is_active,is_admin) VALUES (gen_random_uuid(),'{email}','Shown {s}','First{s}','{(P + s)[:24]}',true,{str(admin).lower()}) RETURNING id")
    users.append(uid); return uid

try:
    admin = mk_user("adm", True); host = mk_user("host"); holder = mk_user("hold"); guest = mk_user("gst"); r1 = mk_user("r1"); r2 = mk_user("r2")
    ev, slug = one(f"""INSERT INTO events (host_user_id, host_type, slug, title, status, starts_at, ends_at, timezone, published_at, city, state)
      VALUES ('{host}', 'user', '{P}-party', 'Rooftop Party {P}', 'published', now() + interval '10 days', now() + interval '10 days 5 hours', 'America/New_York', now() - interval '1 day', 'Freeport', 'NY') RETURNING id || '|' || slug""").split("|")
    events.append(ev)
    tt = one(f"INSERT INTO ticket_types (event_id, name, price_cents, quantity, min_per_order, max_per_order) VALUES ('{ev}', 'Free RSVP', 0, 50, 1, 2) RETURNING id")
    oid = one(f"INSERT INTO ticket_orders (event_id, buyer_user_id, status, ticket_count, subtotal_cents, platform_fee_cents, host_net_cents, total_cents, completed_at) VALUES ('{ev}', '{holder}', 'completed', 1, 0, 0, 0, 0, now()) RETURNING id")
    iid = one(f"INSERT INTO ticket_order_items (order_id, event_id, ticket_type_id, buyer_user_id, quantity, unit_price_cents, status, expires_at) VALUES ('{oid}', '{ev}', '{tt}', '{holder}', 1, 0, 'issued', now() + interval '1 day') RETURNING id")
    sql(f"INSERT INTO tickets (order_id, order_item_id, event_id, ticket_type_id, holder_user_id, item_index, code, status, price_cents, service_fee_cents, per_ticket_fee_cents, platform_fee_cents, host_net_cents) VALUES ('{oid}', '{iid}', '{ev}', '{tt}', '{holder}', 1, '{P.upper()}CODE', 'valid', 0, 0, 0, 0, 0)")
    sql(f"INSERT INTO moderation_queue (reporter_id, target_id, target_type, reason, details) VALUES ('{r1}', '{ev}', 'event', 'scam', 'Venue says no party is booked'), ('{r2}', '{ev}', 'event', 'wrong_details', NULL)")
    post = one(f"INSERT INTO feed_posts (author_id, author_type, post_type, post_intent, content, is_active) VALUES ('{host}', 'user', 'photo', 'share', 'Come through Saturday', true) RETURNING id")
    posts.append(post)
    sql(f"INSERT INTO moderation_queue (reporter_id, target_id, target_type, reason) VALUES ('{r1}', '{post}', 'post', 'Spam')")
    T_ADMIN, T_HOST, T_HOLD, T_GUEST = tok(admin, True), tok(host), tok(holder), tok(guest)

    with sync_playwright() as p:
        b = p.chromium.launch()

        print("Admin: tabs and Reports (W1, W2, W5)")
        ctx, pg, errs = new_ctx(b, T_ADMIN, 1280)
        pg.goto(WEB + "/admin/events"); pg.wait_for_selector("[data-testid=aem-tab-reports]")
        pg.wait_for_selector(".aem-badge", timeout=8000)
        check(pg.locator(".aem-badge").inner_text() == "2", "Reports badge counts 1 event + 1 post", pg.locator(".aem-badge").inner_text())
        check(pg.locator("[data-testid=aem-tab-money]").get_attribute("aria-selected") == "true" and pg.locator(".aem-page").count() == 1, "Money tab first, one page wrapper")
        pg.click("[data-testid=aem-tab-reports]"); pg.wait_for_selector("[data-testid=aem-event-reports]")
        check(pg.url.endswith("#reports"), "address gets #reports", pg.url)
        card = pg.locator(f"[data-report-event='{ev}']")
        txt = card.inner_text()
        check("2 people reported this" in txt and "Scam or fake event" in txt and "Venue says no party is booked" in txt and "Wrong date, place or details" in txt, "card shows count, reasons and the note", txt)
        check(card.locator("[data-testid=aem-act-pause]").count() == 1 and card.locator("[data-testid=aem-act-release]").count() == 0, "live event: Pause offered, no Release")
        shot(pg, "01-reports-events-1280")
        card.locator("[data-testid=aem-act-pause]").click()
        box = card.locator("[data-testid=aem-act-pause-open]")
        check("Ticket holders keep their tickets" in box.inner_text(), "pause box says what happens", box.inner_text())
        box.get_by_role("button", name=re.compile("^Confirm")).click()
        pg.wait_for_selector(".aem-mod-err")
        check("Add a reason" in pg.locator(".aem-mod-err").inner_text(), "empty reason refused in the page")
        box.locator("textarea").fill("Venue confirmed nothing is booked")
        shot(pg, "02-pause-box")
        box.get_by_role("button", name=re.compile("^Confirm")).click()
        pg.wait_for_selector(".aem-banner-ok", timeout=15000)
        check("on hold" in pg.locator(".aem-banner-ok").inner_text(), "notice: put on hold", pg.locator(".aem-banner-ok").inner_text())
        check(one(f"SELECT status FROM events WHERE id='{ev}'") == "paused", "event paused in the database")
        check(pg.locator(f"[data-report-event='{ev}']").count() == 0, "pause closed its reports: card gone")
        pg.get_by_role("button", name=re.compile("^Posts")).click(); pg.wait_for_selector("[data-testid=aem-post-reports]")
        pcard = pg.locator(f"[data-report-post='{post}']")
        check("Come through Saturday" in pcard.inner_text() and "Spam" in pcard.inner_text() and pcard.locator("[data-testid=aem-post-remove]").count() == 1, "post card with text, reason and Remove", pcard.inner_text())
        shot(pg, "03-reports-posts-1280")
        pcard.locator("[data-testid=aem-post-dismiss]").click()
        pcard.locator("textarea").fill("Not spam")
        pcard.get_by_role("button", name=re.compile("^Confirm")).click()
        pg.wait_for_selector("[data-testid=aem-reports-empty]", timeout=15000)
        check(one(f"SELECT status || ',' || admin_action FROM moderation_queue WHERE target_id='{post}'") == "reviewed,dismiss" and one(f"SELECT is_active FROM feed_posts WHERE id='{post}'") == "t", "dismiss: report closed, post stays up")
        check(not errs, "no page errors", errs)
        ctx.close()

        print("\nAdmin: one event, Safety box and trust (W3, W4, W6, W7)")
        ctx, pg, errs = new_ctx(b, T_ADMIN, 1280)
        pg.goto(f"{WEB}/admin/events/{ev}"); pg.wait_for_selector("[data-testid=aem-safety]")
        safety = pg.locator("[data-testid=aem-safety]").inner_text()
        check("On hold" in safety and pg.locator("[data-testid=aem-safety] [data-testid=aem-act-release]").count() == 1 and pg.locator("[data-testid=aem-safety] [data-testid=aem-act-pause]").count() == 0, "paused: Release and Cancel, no Pause", safety)
        check(pg.locator("[data-testid=aem-public-hidden]").count() == 1, "public page link replaced while on hold")
        check(pg.get_by_text(re.compile(r"^Event put on hold( by @\S+)?\. Reason: Venue confirmed nothing is booked\.$")).count() == 1, "activity shows the pause with the reason")
        trust = pg.locator("[data-testid=aem-trust]")
        check("Under new host limits" in trust.inner_text(), "trust: under new host limits", trust.inner_text())
        shot(pg, "04-event-safety-1280")
        trust.locator("[data-testid=aem-trust-switch]").click()
        trust.get_by_role("button", name=re.compile("^Confirm")).click()
        pg.wait_for_function("document.querySelector('[data-testid=aem-trust]')?.innerText.includes('Trusted host')", timeout=15000)
        check(one(f"SELECT count(*) FROM event_host_trust WHERE user_id='{host}'") == "1", "trusted with no note (note optional)")
        pg.locator("[data-testid=aem-trust] [data-testid=aem-trust-switch]").click()
        pg.locator("[data-testid=aem-trust]").get_by_role("button", name=re.compile("^Confirm")).click()
        pg.wait_for_function("document.querySelector('[data-testid=aem-trust]')?.innerText.includes('Under new host limits')", timeout=15000)
        check(one(f"SELECT count(*) FROM event_host_trust WHERE user_id='{host}'") == "0", "trust removed")
        check(not errs, "no page errors", errs)
        ctx.close()

        print("\nOn hold page and /tickets (W10, W11)")
        ctx, pg, errs = new_ctx(b, T_HOLD, 390)
        pg.goto(f"{WEB}/e/{slug}"); pg.wait_for_selector("[data-testid=on-hold-banner]")
        check("Your ticket is safe" in pg.locator("[data-testid=on-hold-banner]").inner_text(), "holder banner")
        check(pg.get_by_text("On hold", exact=True).count() >= 1 and pg.get_by_text("Sales ended").count() == 0, "ticket rows say On hold")
        check(pg.locator(".ev-bar").count() == 0, "nothing on sale (no bar)")
        check(pg.locator("[data-testid=report-event]").count() == 1, "a holder can still report it")
        check(overflow(pg) <= 0, "no sideways scroll at 390", overflow(pg))
        shot(pg, "05-on-hold-holder-390")
        pg.goto(f"{WEB}/tickets"); pg.wait_for_selector("[data-testid=ticket-on-hold]", timeout=10000)
        check("On hold, your ticket is safe" in pg.locator("[data-testid=ticket-on-hold]").inner_text(), "/tickets label")
        ctx.close()
        ctx, pg, errs = new_ctx(b, T_HOST, 390)
        pg.goto(f"{WEB}/e/{slug}"); pg.wait_for_selector("[data-testid=on-hold-banner]")
        check("Check your email" in pg.locator("[data-testid=on-hold-banner]").inner_text() and pg.locator("[data-testid=report-event]").count() == 0, "host banner, no Report link")
        ctx.close()
        ctx, pg, errs = new_ctx(b, T_GUEST, 390)
        pg.goto(f"{WEB}/e/{slug}"); pg.wait_for_selector("text=Event not found", timeout=10000)
        check(True, "guest without a ticket: Event not found")
        ctx.close()

        print("\nRelease, then Report this event (W8, W9)")
        ctx, pg, errs = new_ctx(b, T_ADMIN, 1280)
        pg.goto(f"{WEB}/admin/events/{ev}"); pg.wait_for_selector("[data-testid=aem-safety] [data-testid=aem-act-release]")
        pg.click("[data-testid=aem-safety] [data-testid=aem-act-release]")
        pg.locator("[data-testid=aem-safety] textarea").fill("Venue called back, it's booked")
        pg.locator("[data-testid=aem-safety]").get_by_role("button", name=re.compile("^Confirm")).click()
        pg.wait_for_selector(".aem-banner-ok", timeout=15000)
        check(one(f"SELECT status FROM events WHERE id='{ev}'") == "published", "released")
        ctx.close()
        ctx, pg, errs = new_ctx(b, T_GUEST, 390)
        pg.goto(f"{WEB}/e/{slug}"); pg.wait_for_selector("[data-testid=report-event]")
        check(pg.locator("[data-testid=on-hold-banner]").count() == 0, "live again: no banner")
        pg.click("[data-testid=report-event]"); pg.wait_for_selector("[data-testid=report-sheet]")
        pg.get_by_role("button", name="Send report").click()
        check(pg.locator(".rp-err").inner_text() == "Choose a reason.", "no reason: Choose a reason.")
        pg.get_by_label("Something else").check()
        pg.get_by_role("button", name="Send report").click()
        check(pg.locator(".rp-err").inner_text() == "Tell us what's wrong.", "something else needs a note")
        check(overflow(pg) <= 0, "sheet: no sideways scroll at 390", overflow(pg))
        shot(pg, "06-report-sheet-390")
        pg.locator(".rp-note").fill("The flyer is copied from another party")
        pg.get_by_role("button", name="Send report").click()
        pg.wait_for_selector(".ev-toast", timeout=10000)
        check(pg.locator(".ev-toast").inner_text() == "Thanks. We'll review this event." and pg.locator("[data-testid=report-sheet]").count() == 0, "sent: sheet closes, thanks toast")
        check(one(f"SELECT reason || '|' || details FROM moderation_queue WHERE target_type='event' AND target_id='{ev}' AND reporter_id='{guest}'") == "other|The flyer is copied from another party", "saved with the note")
        check(not errs, "no page errors", errs)
        ctx.close()
        ctx, pg, errs = new_ctx(b, None, 390)
        pg.goto(f"{WEB}/e/{slug}"); pg.wait_for_selector("[data-testid=report-event]")
        pg.click("[data-testid=report-event]"); pg.wait_for_selector("[data-testid=quick-auth-sheet]", timeout=10000)
        check(pg.locator("#qa-title").inner_text() == "Report this event", "signed out: sign up sheet titled Report this event", pg.locator("#qa-title").inner_text())
        shot(pg, "07-report-signed-out-390")
        ctx.close()

        print("\nPhone width, admin Reports")
        sql(f"INSERT INTO moderation_queue (reporter_id, target_id, target_type, reason) VALUES ('{r2}', '{ev}', 'event', 'hate') ON CONFLICT DO NOTHING")
        ctx, pg, errs = new_ctx(b, T_ADMIN, 375)
        pg.goto(WEB + "/admin/events#reports"); pg.wait_for_selector("[data-testid=aem-event-reports]", timeout=10000)
        pg.locator(f"[data-report-event='{ev}'] [data-testid=aem-act-cancel]").click()
        check(overflow(pg) <= 0, "375: no sideways scroll with the cancel box open", overflow(pg))
        shot(pg, "08-reports-375-cancel")
        ctx.close()
        b.close()
finally:
    ids = "','".join(events + posts)
    us = "','".join(users)
    for q in [f"DELETE FROM moderation_queue WHERE target_id IN ('{ids}') OR reporter_id IN ('{us}')",
              f"DELETE FROM audit_logs WHERE target_id IN ('{ids}','{us}') OR actor_id IN ('{us}')",
              f"DELETE FROM event_host_trust WHERE user_id IN ('{us}')",
              f"DELETE FROM feed_posts WHERE id IN ('{ids}')",
              f"DELETE FROM tickets WHERE event_id IN ('{ids}')", f"DELETE FROM ticket_order_items WHERE event_id IN ('{ids}')",
              f"DELETE FROM ticket_orders WHERE event_id IN ('{ids}')", f"DELETE FROM ticket_types WHERE event_id IN ('{ids}')",
              f"DELETE FROM notifications WHERE user_id IN ('{us}')",
              f"DELETE FROM events WHERE id IN ('{ids}')", f"DELETE FROM users WHERE id IN ('{us}')"]:
        try: sql(q)
        except Exception as e: print("cleanup:", str(e)[:200])

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
