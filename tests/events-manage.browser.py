"""
Browser checks for /events/mine and /events/[id]/manage (Playwright for Python, Chromium). LOCAL ONLY.
Run: python3 tests/events-manage.browser.py
Env (defaults shown): EM_WEB_URL=http://localhost:3101  EM_BACKEND_URL=http://localhost:5071
  EM_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde_test  EM_BACKEND_DIR=/home/claude/outsyde-backend
  EM_SHOTS=<dir for screenshots>  (optional)
Skips (exit 0) when the web or backend server is not up. Needs psql and node on PATH.
Seeds a host, a guest and a stranger. Per viewport it publishes one free event through the local backend
(accept the host agreement first) with one RSVP from the guest, then checks the host pages. Cleans up.
"""
import re, json, os, subprocess, sys, time, urllib.request
from urllib.parse import urlparse

WEB = os.environ.get("EM_WEB_URL", "http://localhost:3101")
BACKEND = os.environ.get("EM_BACKEND_URL", "http://localhost:5071")
PG = os.environ.get("EM_PG_URL", "postgresql://outsyde:outsyde@localhost:5432/outsyde_test")
BDIR = os.environ.get("EM_BACKEND_DIR", "/home/claude/outsyde-backend")
SHOTS = os.environ.get("EM_SHOTS")

for u in (WEB, BACKEND, PG):
    if urlparse(u).hostname not in ("localhost", "127.0.0.1", "::1"):
        sys.exit("refusing to run: all URLs must be localhost")

def up(u):
    try:
        urllib.request.urlopen(u, timeout=3); return True
    except Exception as e:
        return hasattr(e, "code")
if not (up(WEB + "/events/mine") and up(BACKEND + "/api/events")):
    print("skipped: web or backend server is not up"); sys.exit(0)
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print("skipped: playwright for python not installed"); sys.exit(0)

passed = failed = 0
def check(cond, name, detail=""):
    global passed, failed
    if cond: passed += 1; print("  ok  " + name)
    else: failed += 1; print("  FAIL " + name, str(detail)[:3000])

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

P = "em" + format(int(time.time()), "x")
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
guest = sql(f"INSERT INTO users (id,email,name,first_name,username) VALUES (gen_random_uuid(),'{P}-guest@test.local','Gwen Surname','Gwen','{P}gwen') RETURNING id").splitlines()[0]
stranger = sql(f"INSERT INTO users (id,email,name,first_name,username) VALUES (gen_random_uuid(),'{P}-stranger@test.local','Stan Stranger','Stan','{P}stan') RETURNING id").splitlines()[0]

def seed_event(ht, gt, title):
    ev = api("POST", "/api/events", ht, {"title": title, "startsAt": iso(10), "endsAt": iso(10, 4), "timezone": "America/New_York",
            "venueName": "The Hall", "addressLine1": "12 Main St", "city": "Freeport", "state": "NY", "postalCode": "11520", "capacity": 30})["event"]
    ty = api("POST", f"/api/events/{ev['id']}/ticket-types", ht, {"name": "Free RSVP", "priceCents": 0, "quantity": 10})["ticketType"]
    pub = api("POST", f"/api/events/{ev['id']}/publish", ht)
    check(pub.get("success") is True, "seeded event is published", pub)
    r = api("POST", f"/api/events/{ev['id']}/rsvp", gt, {"ticketTypeId": ty["id"], "quantity": 1, "idempotencyKey": f"{P}-{ev['id'][:8]}"})
    check(r.get("success") is True, "seeded RSVP", r)
    return ev

try:
    ht, gt, st = tok(host), tok(guest), tok(stranger)
    ag = api("GET", "/api/events/host-agreement", ht)["agreement"]
    acc = api("POST", "/api/events/host-agreement/accept", ht, {"version": ag["version"]})
    check(acc.get("success") is True, "host agreement accepted", acc)

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for width in (375, 1280):
            print(f"{width}px")
            title = f"{P} Host Night {width}"
            ev = seed_event(ht, gt, title)
            mng = f"{WEB}/events/{ev['id']}/manage"

            # signed out
            ctx, pg, errs = new_ctx(browser, None, width)
            pg.goto(WEB + "/events/mine")
            pg.wait_for_url("**/login**", timeout=20000)
            check(urlparse(pg.url).path == "/login" and re.search(r"return=(%2F|/)events(%2F|/)mine", pg.url) is not None, "mine signed out goes to /login?return=/events/mine", pg.url)
            pg.goto(mng)
            pg.wait_for_url("**/login**", timeout=20000)
            check(re.search(r"return=(%2F|/)events(%2F|/)" + ev["id"] + r"(%2F|/)manage", pg.url) is not None, "manage signed out goes to login with return", pg.url)
            ctx.close()

            # host: my events
            ctx, pg, errs = new_ctx(browser, ht, width)
            pg.goto(WEB + "/events/mine")
            up = pg.locator("[data-testid=group-upcoming]")
            up.wait_for(timeout=20000)
            check(title in up.inner_text(), "mine lists the event under Upcoming", up.inner_text())
            check(pg.locator("[data-testid=group-drafts]").count() == 0, "no empty Drafts group")
            check(up.locator(f"a[href='/events/{ev['id']}/manage']").count() == 1, "row links to manage")
            check(pg.locator("header").get_by_role("link", name="Scan tickets").get_attribute("href") == "/events/door", "mine header links Scan tickets to /events/door")
            check(pg.locator("header").get_by_role("link", name="Host an event").count() == 1, "mine header keeps Host an event")
            check("12 Main St" not in pg.content(), "no street address on mine")
            check(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"{width}px: mine has no horizontal overflow")
            if SHOTS: pg.screenshot(path=f"{SHOTS}/mine-{width}.png", full_page=True)

            # host: manage
            up.locator("a").first.click()
            pg.wait_for_url("**/manage", timeout=20000)
            pg.locator("[data-testid=guest-row]").first.wait_for(timeout=20000)
            check(pg.locator("[data-testid=status]").inner_text() == "PUBLISHED", "status PUBLISHED")
            check(pg.locator("[data-testid=taken]").inner_text() == "1 / 30", "tickets taken 1 / 30", pg.locator("[data-testid=taken]").inner_text())
            row = pg.locator("[data-testid=guest-row]").first.inner_text()
            check("Gwen" in row and f"@{P}gwen" in row, "guest first name and @username", row)
            check("Free RSVP" in row, "guest row shows the ticket type", row)
            check("Surname" not in pg.content() and "test.local" not in pg.content(), "no last name or email on the page")
            check(pg.get_by_role("link", name="Edit", exact=True).get_attribute("href") == f"/events/{ev['id']}/edit", "Edit link")
            check(pg.get_by_role("link", name="View page").get_attribute("href") == f"/e/{ev['slug']}", "View page link")
            heads = pg.evaluate("[...document.querySelectorAll('h1, h2')].map(h => h.tagName + ':' + h.textContent)")
            check(heads[0] == "H1:" + title and pg.locator("h1").count() == 1, "the page h1 (the event title) is the first heading", heads)
            check(pg.locator(".mg-head-label").inner_text() == "MANAGE EVENT" and not any("MANAGE EVENT" in h for h in heads), "MANAGE EVENT is a small label, not a heading", heads)
            share = pg.get_by_role("button", name="Share link")
            check(share.count() == 1 and share.get_attribute("style") is None and "mg-share" in (share.get_attribute("class") or ""), "Share link uses a class, no inline styles")
            check(pg.get_by_role("link", name="Door team").get_attribute("href") == f"/events/{ev['id']}/team", "Door team link")
            check(pg.get_by_role("link", name="Scan tickets").get_attribute("href") == f"/events/{ev['id']}/scan", "Scan tickets link")
            check(pg.locator("[data-testid=type-row]").count() == 1, "one ticket type bar")
            check("12 Main St" not in pg.content(), "no street address on manage")
            check(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"{width}px: manage has no horizontal overflow")
            if SHOTS: pg.screenshot(path=f"{SHOTS}/manage-{width}.png", full_page=True)

            # cancel needs a confirm
            pg.get_by_role("button", name="Cancel event").click()
            conf = pg.locator("[data-testid=cancel-confirm]")
            conf.wait_for(timeout=5000)
            check("refunded in full" in conf.inner_text() and "RSVPs are cancelled" in conf.inner_text(), "confirm explains refunds and RSVPs", conf.inner_text())
            check(pg.locator("[data-testid=status]").inner_text() == "PUBLISHED", "still PUBLISHED before confirming")
            check(sql(f"SELECT status FROM events WHERE id='{ev['id']}'") == "published", "DB still published before confirming")
            pg.get_by_role("button", name="Keep event").click()
            check(pg.locator("[data-testid=cancel-confirm]").count() == 0, "Keep event closes the confirm")
            pg.get_by_role("button", name="Cancel event").click()
            pg.get_by_role("button", name="Yes, cancel event").click()
            pg.wait_for_function("document.querySelector('[data-testid=status]')?.textContent === 'CANCELLED'", timeout=20000)
            check(pg.locator("[data-testid=status]").inner_text() == "CANCELLED", "status shows CANCELLED")
            check(sql(f"SELECT status FROM events WHERE id='{ev['id']}'") == "cancelled", "DB status cancelled")
            check(pg.get_by_text("1 RSVP cancelled").count() == 1, "notice says the RSVP was cancelled")
            check(pg.get_by_role("button", name="Cancel event").count() == 0, "no Cancel event button once cancelled")
            check(real(errs) == [], "no console or page errors (host)", errs)

            # a paused event has no public page: no View page link
            pz = api("POST", "/api/events", ht, {"title": f"{P} Paused {width}", "startsAt": iso(12), "endsAt": iso(12, 3), "timezone": "America/New_York", "city": "Freeport", "state": "NY", "capacity": 10})["event"]
            sql(f"UPDATE events SET status='paused', published_at=now() WHERE id='{pz['id']}'")
            pg.goto(f"{WEB}/events/{pz['id']}/manage")
            pg.locator("[data-testid=status]").wait_for(timeout=20000)
            check(pg.locator("[data-testid=status]").inner_text() == "PAUSED", "paused event shows PAUSED")
            check(pg.get_by_role("link", name="View page").count() == 0, "paused: no View page link")
            check(pg.get_by_role("link", name="Edit", exact=True).count() == 1, "paused: Edit still there")

            # discard a draft
            dtitle = f"{P} Draft Gone {width}"
            dr = api("POST", "/api/events", ht, {"title": dtitle, "startsAt": iso(14), "endsAt": iso(14, 3), "timezone": "America/New_York", "city": "Freeport", "state": "NY", "capacity": 10})["event"]
            pg.goto(f"{WEB}/events/{dr['id']}/manage")
            pg.get_by_role("button", name="Discard draft").wait_for(timeout=20000)
            check(pg.get_by_role("button", name="Delete draft").count() == 0, "no Delete draft wording")
            pg.get_by_role("button", name="Discard draft").click()
            conf = pg.locator("[data-testid=cancel-confirm]")
            conf.wait_for(timeout=5000)
            check("Discard this draft? It won't be published." in conf.inner_text(), "discard confirm copy", conf.inner_text())
            check(pg.get_by_role("button", name="Keep draft").count() == 1, "Keep draft button")
            pg.get_by_role("button", name="Keep draft").click()
            check(conf.count() == 0 and sql(f"SELECT status FROM events WHERE id='{dr['id']}'") == "draft", "Keep draft closes the confirm, still a draft")
            pg.get_by_role("button", name="Discard draft").click()
            pg.get_by_role("button", name="Yes, discard draft").click()
            done = pg.locator("[data-testid=draft-discarded]")
            done.wait_for(timeout=20000)
            check("Draft discarded." in done.inner_text(), "Draft discarded. shown", done.inner_text())
            check(done.get_by_role("link", name="Back to your events").get_attribute("href") == "/events/mine", "link back to /events/mine")
            check(sql(f"SELECT status FROM events WHERE id='{dr['id']}'") == "cancelled", "DB: draft cancelled")
            pg.goto(WEB + "/events/mine")
            pg.locator("[data-testid=group-cancelled]").wait_for(timeout=20000)
            body = pg.locator(".mg-body").inner_text()
            check(dtitle not in body, "mine leaves out the discarded draft (never published)", body)
            check(title in pg.locator("[data-testid=group-cancelled]").inner_text(), "mine still lists the cancelled published event")
            check(real(errs) == [], "no console or page errors (paused, discard)", errs)
            ctx.close()

            # stranger
            ctx, pg, errs = new_ctx(browser, st, width)
            pg.goto(mng)
            pg.locator("[data-testid=not-found]").wait_for(timeout=20000)
            check("Event not found" in pg.locator("[data-testid=not-found]").inner_text(), "stranger sees Event not found")
            check(title not in pg.content(), "stranger does not see the title")
            check(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"{width}px: not found has no horizontal overflow")
            pg.goto(f"{WEB}/events/not-a-uuid/manage")
            pg.locator("[data-testid=not-found]").wait_for(timeout=20000)
            check(True, "bad id also shows Event not found")
            check(real([e for e in errs if "404" not in e]) == [], "no console or page errors (stranger)", errs)
            ctx.close()
        browser.close()
finally:
    ev_ids = f"SELECT id FROM events WHERE host_user_id='{host}'"
    for stmt in (
        f"DELETE FROM tickets WHERE event_id IN ({ev_ids})",
        f"DELETE FROM ticket_order_items WHERE order_id IN (SELECT id FROM ticket_orders WHERE event_id IN ({ev_ids}))",
        f"DELETE FROM ticket_orders WHERE event_id IN ({ev_ids})",
        f"DELETE FROM ticket_account_counts WHERE ticket_type_id IN (SELECT id FROM ticket_types WHERE event_id IN ({ev_ids}))",
        f"DELETE FROM ticket_types WHERE event_id IN ({ev_ids})",
        f"DELETE FROM events WHERE host_user_id='{host}'",
        f"DELETE FROM host_agreement_acceptances WHERE user_id='{host}'",
        f"DELETE FROM users WHERE email LIKE '{P}-%'",
    ):
        try:
            sql(stmt)
        except Exception as e:
            print("  cleanup failed:", str(e)[:200])

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
