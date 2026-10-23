"""
Browser checks for the host create and edit flow (/events/new, /events/[id]/edit). LOCAL ONLY.
Run: python3 tests/events-editor.browser.py
Env (defaults shown): EE_WEB_URL=http://localhost:3101  EE_BACKEND_URL=http://localhost:5071 (paid events off)
  EE_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde_test  EE_BACKEND_DIR=/home/claude/outsyde-backend
  EE_SHOTS=<dir for screenshots>  (optional)
Skips (exit 0) when the web or backend server is not up. Needs psql and node on PATH.
Creates one host, makes a free event end to end in the browser (agreement gate, publish, reload keeps values),
checks the paid refusal and the payout banner on a second draft, and removes everything it created.
"""
import re, json, os, subprocess, sys, time, urllib.request
from urllib.parse import urlparse

WEB = os.environ.get("EE_WEB_URL", "http://localhost:3101")
BACKEND = os.environ.get("EE_BACKEND_URL", "http://localhost:5071")
PG = os.environ.get("EE_PG_URL", "postgresql://outsyde:outsyde@localhost:5432/outsyde_test")
BDIR = os.environ.get("EE_BACKEND_DIR", "/home/claude/outsyde-backend")
SHOTS = os.environ.get("EE_SHOTS")
TZ = "America/New_York"

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

P = "ee" + format(int(time.time()), "x")
def iso(days, hours=0):
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + days * 86400 + hours * 3600))

def real(errs):
    return [e for e in errs if not e.startswith("Failed to load resource") and "/_vercel/insights/" not in e]

def new_ctx(browser, token, width):
    ctx = browser.new_context(viewport={"width": width, "height": 860}, timezone_id=TZ)
    if token:
        ctx.add_cookies([{"name": "outsyde_access_token", "value": token, "url": WEB}])
    ctx.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    return ctx, pg, errs

def no_overflow(pg):
    return pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth")

def shot(pg, name):
    if SHOTS: pg.screenshot(path=f"{SHOTS}/{name}.png", full_page=True)

# A 1x1 PNG for the cover upload.
PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                    "1f15c4890000000d49444154789c6360f8cfc0f01f0005000201e221bc330000000049454e44ae426082")
DATE = time.strftime("%Y-%m-%d", time.gmtime(time.time() + 12 * 86400))

host = sql(f"INSERT INTO users (id,email,name,first_name,username) VALUES (gen_random_uuid(),'{P}-host@test.local','Host Lastname','Host','{P}host') RETURNING id").splitlines()[0]
try:
    ht = tok(host)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        print("signed out")
        ctx, pg, errs = new_ctx(browser, None, 375)
        pg.goto(WEB + "/events/new")
        pg.wait_for_url("**/login**", timeout=30000)
        check(urlparse(pg.url).path == "/login" and re.search(r"return=(%2F|/)events(%2F|/)new", pg.url) is not None, "/events/new goes to /login?return=/events/new", pg.url)
        some = "00000000-0000-4000-8000-000000000000"
        pg.goto(WEB + f"/events/{some}/edit")
        pg.wait_for_url("**/login**", timeout=30000)
        check(f"events%2F{some}%2Fedit" in pg.url or f"events/{some}/edit" in pg.url, "/events/<id>/edit goes to login with its own return", pg.url)
        ctx.close()

        print("create a free event (375px, signed in)")
        ctx, pg, errs = new_ctx(browser, ht, 375)
        pg.goto(WEB + "/events/new")
        pg.get_by_role("heading", name="Create Event").wait_for(timeout=60000)
        check(pg.get_by_text("Add a cover photo").count() == 1, "start screen offers the cover photo first")
        check(no_overflow(pg), "start: no horizontal overflow")
        shot(pg, "ee-start")
        pg.locator("input[type=file]").set_input_files({"name": "c.png", "mimeType": "image/png", "buffer": PNG})
        pg.wait_for_function("() => !document.body.innerText.includes('Uploading')", timeout=30000)
        uploaded = pg.locator("img.ed-cover-img").count() == 1
        upload_err = pg.get_by_text("We couldn't upload that photo").count() == 1
        check(uploaded or upload_err, "cover upload either shows the photo or a plain error", pg.inner_text("main")[:300])
        print("      (cover upload " + ("stored a photo" if uploaded else "was refused by the local backend: no image storage here") + ")")
        pg.get_by_role("button", name="Next", exact=True).click()

        pg.get_by_role("heading", name="Event details").wait_for()
        check(pg.locator("#ev-tz").input_value() == TZ, "time zone defaults to the browser's", pg.locator("#ev-tz").input_value())
        check(pg.get_by_role("radio", name="Me").get_attribute("aria-checked") == "true", "Hosted as: Me is picked")
        check(pg.get_by_role("radio", name="My business").count() == 0, "no business option for a person without one")
        pg.get_by_role("button", name="Next: tickets").click()
        check(pg.get_by_text("Give your event a name.").count() == 1, "empty name is refused in plain words")
        title = f"{P} Rooftop Night"
        pg.locator("#ev-title").fill(title)
        pg.locator("#ev-date").fill(DATE)
        pg.locator("#ev-start").fill("21:00")
        pg.locator("#ev-end").fill("02:00")
        check(pg.get_by_text("Ends the next day.").count() == 1, "an end before the start says next day")
        pg.locator("#ev-venue").fill("The Roof")
        pg.locator("#ev-a1").fill("12 Main St")
        pg.locator("#ev-city").fill("Freeport")
        pg.locator("#ev-state").fill("NY")
        pg.locator("#ev-zip").fill("11520")
        pg.get_by_label("People with a ticket, on the day of the event").check()
        check(pg.get_by_text("Until then they see Freeport, NY only.").count() == 1, "day of choice explains what people see until then")
        pg.locator("#ev-about").fill("Bring a jacket.")
        check(no_overflow(pg), "details: no horizontal overflow")
        shot(pg, "ee-details")
        pg.get_by_role("button", name="Next: tickets").click()

        pg.get_by_role("heading", name="Tickets").wait_for(timeout=30000)
        pg.wait_for_url(re.compile(r"/events/[0-9a-f-]{36}/edit$"), timeout=15000)
        eid = re.search(r"/events/([0-9a-f-]{36})/edit", pg.url).group(1)
        check(sql(f"SELECT status FROM events WHERE id='{eid}' AND host_user_id='{host}'") == "draft", "first save created the draft and the address bar points to its edit page")
        pg.get_by_role("button", name="Add a ticket type").click()
        dlg = pg.get_by_role("dialog")
        dlg.get_by_label("NAME").fill("Free RSVP")
        dlg.get_by_label("HOW MANY").fill("50")
        dlg.get_by_role("button", name="Add ticket").click()
        dlg.wait_for(state="detached", timeout=15000)
        row = pg.locator("li.ed-type")
        check(row.count() == 1 and "50 spots · 1 per person" in row.inner_text() and "Free" in row.inner_text(), "ticket type row: count, limit and price", row.inner_text() if row.count() else "")
        pg.locator("#cap").fill("80")
        pg.get_by_label("Hours before the event").fill("12")
        check(pg.locator(".ed-banner").count() == 0, "no payout banner for free tickets")
        check(no_overflow(pg), "tickets: no horizontal overflow")
        shot(pg, "ee-tickets")
        pg.get_by_role("button", name="Next: review").click()

        pg.get_by_role("heading", name="Review").wait_for(timeout=30000)
        box = pg.get_by_test_id("agreement-box")
        box.wait_for(timeout=30000)
        publish = pg.get_by_role("button", name="Publish event")
        agree = pg.get_by_label("I have read and agree to the Event Host Agreement.")
        check(publish.is_disabled(), "Publish is disabled before the agreement is accepted")
        check(agree.is_disabled(), "the checkbox is disabled before reading to the end")
        check("12 Main St" not in pg.locator(".ed-card").inner_text(), "Discover preview never shows the street")
        check("Freeport, NY" in pg.locator(".ed-card").inner_text() and "Free RSVP" in pg.locator(".ed-card").inner_text(), "Discover preview shows the place and price", pg.locator(".ed-card").inner_text())
        box.evaluate("el => { el.scrollTop = (el.scrollHeight - el.clientHeight) / 2; el.dispatchEvent(new Event('scroll')); }")
        pg.wait_for_timeout(200)
        check(agree.is_disabled(), "halfway through is not enough")
        box.evaluate("el => { el.scrollTop = el.scrollHeight - el.clientHeight - 20; el.dispatchEvent(new Event('scroll')); }")
        pg.wait_for_timeout(200)
        check(agree.is_disabled(), "20 px before the end is not enough")
        box.evaluate("el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); }")
        pg.wait_for_function("() => !document.querySelector('.ed-check input').disabled", timeout=5000)
        check(agree.is_enabled() and publish.is_disabled(), "at the end the checkbox opens, Publish still waits")
        check(no_overflow(pg), "review: no horizontal overflow")
        shot(pg, "ee-review")
        agree.click()
        pg.get_by_text("You accepted the Event Host Agreement on").wait_for(timeout=15000)
        check(sql(f"SELECT count(*) FROM host_agreement_acceptances WHERE user_id='{host}'") == "1", "acceptance recorded with the current version")
        check(publish.is_enabled(), "Publish opens once accepted")
        publish.click()

        pg.get_by_role("heading", name="YOUR EVENT IS LIVE").wait_for(timeout=30000)
        slug = sql(f"SELECT slug FROM events WHERE id='{eid}'")
        check(pg.get_by_test_id("share-url").inner_text() == f"goutsyde.com/e/{slug}", "share link is goutsyde.com/e/<slug>", pg.get_by_test_id("share-url").inner_text())
        check(pg.get_by_role("link", name="View event").get_attribute("href") == f"/e/{slug}", "View event links to the event page")
        check(pg.get_by_role("link", name="Manage event").get_attribute("href") == f"/events/{eid}/manage", "Manage event links to manage")
        check(pg.get_by_role("button", name="Copy").count() == 1, "Copy button")
        check(no_overflow(pg), "live: no horizontal overflow")
        shot(pg, "ee-live")
        row = sql(f"SELECT status, timezone, visibility, address_visibility, capacity, refund_policy, refund_cutoff_hours, to_char(starts_at AT TIME ZONE 'America/New_York','YYYY-MM-DD HH24:MI'), to_char(ends_at AT TIME ZONE 'America/New_York','YYYY-MM-DD HH24:MI') FROM events WHERE id='{eid}'").split("|")
        next_day = time.strftime("%Y-%m-%d", time.gmtime(time.mktime(time.strptime(DATE, "%Y-%m-%d")) + 86400 + 43200))
        check(row == ["published", TZ, "public", "ticket_holders_day_of", "80", "until_cutoff", "12", f"{DATE} 21:00", f"{next_day} 02:00"], "saved values match what was entered (end is the next day)", row)

        print("reload the edit page")
        pg.goto(WEB + f"/events/{eid}/edit")
        pg.get_by_role("heading", name="Event details").wait_for(timeout=60000)
        vals = [pg.locator(s).input_value() for s in ("#ev-title", "#ev-date", "#ev-start", "#ev-end", "#ev-tz", "#ev-venue", "#ev-a1", "#ev-city", "#ev-state", "#ev-zip", "#ev-about")]
        check(vals == [title, DATE, "21:00", "02:00", TZ, "The Roof", "12 Main St", "Freeport", "NY", "11520", "Bring a jacket."], "details keep their values after reload", vals)
        check(pg.get_by_label("People with a ticket, on the day of the event").is_checked(), "address choice kept")
        check(pg.get_by_role("switch", name="Show in Discover").get_attribute("aria-checked") == "true", "Show in Discover kept")
        pg.get_by_role("button", name="Next: tickets").click()
        pg.get_by_role("heading", name="Tickets").wait_for(timeout=30000)
        check(pg.locator("#cap").input_value() == "80" and pg.get_by_label("Hours before the event").input_value() == "12", "capacity and refund hours kept")
        check(pg.get_by_role("radio", name="No refunds").is_disabled(), "published: No refunds can't be picked (only more flexible)")
        check(real(errs) == [], "no console or page errors", errs)
        ctx.close()

        print("paid draft (paid events are off on this backend)")
        ev2 = api("POST", "/api/events", ht, {"title": f"{P} Paid Night", "startsAt": iso(14), "endsAt": iso(14, 3), "timezone": TZ, "city": "Freeport", "state": "NY"})["event"]
        api("POST", f"/api/events/{ev2['id']}/ticket-types", ht, {"name": "General admission", "priceCents": 2000, "quantity": 30})
        ctx, pg, errs = new_ctx(browser, ht, 1280)
        pg.goto(WEB + f"/events/{ev2['id']}/edit")
        pg.get_by_role("heading", name="Event details").wait_for(timeout=60000)
        pg.get_by_role("button", name="Next: tickets").click()
        pg.get_by_role("heading", name="Tickets").wait_for(timeout=30000)
        pg.locator(".ed-banner").wait_for(timeout=15000)
        check(pg.get_by_role("button", name="Set up payouts").count() == 1, "payout banner with Set up payouts for a paid type")
        check("$20.00" in pg.locator("li.ed-type").inner_text(), "paid row shows the price")
        pg.get_by_role("button", name="Edit General admission").click()
        dlg = pg.get_by_role("dialog")
        check("You earn $19.60 per ticket." in dlg.inner_text() and "%" not in dlg.inner_text(), "sheet shows host earnings and no fee percentage", dlg.inner_text())
        dlg.get_by_role("button", name="Close").click()
        pg.get_by_role("button", name="Add a ticket type").click()
        dlg = pg.get_by_role("dialog")
        dlg.get_by_label("NAME").fill("Spare")
        dlg.get_by_label("HOW MANY").fill("5")
        dlg.get_by_role("button", name="Add ticket").click()
        dlg.wait_for(state="detached", timeout=15000)
        check(pg.locator("li.ed-type").count() == 2, "second type added")
        pg.get_by_role("button", name="Remove Spare").click()
        pg.get_by_text("Spare removed.").wait_for(timeout=15000)
        check(pg.locator("li.ed-type").count() == 1, "unsold type removed")
        pg.get_by_role("button", name="Next: review").click()
        pg.get_by_role("heading", name="Review").wait_for(timeout=30000)
        pg.get_by_text("You accepted the Event Host Agreement on").wait_for(timeout=15000)
        check(pg.get_by_label("I have read and agree to the Event Host Agreement.").count() == 0, "already accepted: no checkbox, just the accepted line")
        pg.get_by_role("button", name="Read it again").click()
        check(pg.get_by_test_id("agreement-box").count() == 1, "Read it again shows the text")
        pg.get_by_role("button", name="Publish event").click()
        pg.get_by_text("Paid tickets aren't available yet. Use free tickets for now.").wait_for(timeout=15000)
        check(pg.get_by_role("button", name="Go to tickets").count() == 1, "paid refusal offers Go to tickets")
        check(sql(f"SELECT status FROM events WHERE id='{ev2['id']}'") == "draft", "paid draft stays a draft")
        check(real(errs) == [], "no console or page errors", errs)
        shot(pg, "ee-paid-refused")

        print("agreement refusals (responses intercepted: the local backend has one fixed version)")
        new_text = "## 1. Changed\n\nA short new version that fits its box."
        pg.route("**/api/events/*/publish", lambda r: r.fulfill(status=409, content_type="application/json",
            body=json.dumps({"success": False, "error": "Read and accept the Event Host Agreement to publish.", "code": "HOST_AGREEMENT_REQUIRED"})))
        pg.route("**/api/events/host-agreement", lambda r: r.fulfill(status=200, content_type="application/json",
            body=json.dumps({"success": True, "agreement": {"version": "next-version", "title": "Outsyde Event Host Agreement", "format": "markdown",
                "text": new_text, "accepted": False, "acceptedVersion": None, "acceptedAt": None}})))
        pg.route("**/api/events/host-agreement/accept", lambda r: r.fulfill(status=409, content_type="application/json",
            body=json.dumps({"success": False, "error": "The Event Host Agreement was updated. Read the new version to continue.", "code": "AGREEMENT_VERSION_CHANGED"})))
        pg.get_by_role("button", name="Publish event").click()
        pg.get_by_text("Read and accept the Event Host Agreement to publish.").wait_for(timeout=15000)
        agree = pg.get_by_label("I have read and agree to the Event Host Agreement.")
        agree.wait_for(timeout=15000)
        check(pg.get_by_test_id("agreement-box").inner_text().startswith("1. Changed"), "HOST_AGREEMENT_REQUIRED shows the agreement again")
        check(pg.get_by_role("button", name="Publish event").is_disabled(), "Publish is locked again until accepted")
        check(agree.is_enabled(), "a text that fits its box counts as read")
        agree.click()
        pg.get_by_text("The Event Host Agreement was updated. Read the new version to continue.").wait_for(timeout=15000)
        check(agree.count() == 1 and not agree.is_checked() and pg.get_by_role("button", name="Publish event").is_disabled(), "AGREEMENT_VERSION_CHANGED reloads it unaccepted, Publish stays locked")
        check(real(errs) == [], "no console or page errors", errs)
        ctx.close()

        print("drafts on the start screen")
        ctx, pg, errs = new_ctx(browser, ht, 375)
        pg.goto(WEB + "/events/new")
        pg.get_by_text("YOUR DRAFTS").wait_for(timeout=60000)
        d = pg.locator(f"a[href='/events/{ev2['id']}/edit']")
        check(d.count() == 1 and "Paid Night" in d.inner_text(), "draft listed to continue")
        check(pg.locator(f"a[href='/events/{eid}/edit']").count() == 0, "published event is not a draft")
        ctx.close()
        browser.close()
finally:
    ev_ids = f"SELECT id FROM events WHERE host_user_id='{host}'"
    for stmt in (
        f"DELETE FROM ticket_types WHERE event_id IN ({ev_ids})",
        f"DELETE FROM events WHERE host_user_id='{host}'",
        f"DELETE FROM host_agreement_acceptances WHERE user_id='{host}'",
        f"DELETE FROM users WHERE id='{host}'",
    ):
        try:
            sql(stmt)
        except Exception as e:
            print("  cleanup failed:", str(e)[:200])

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
