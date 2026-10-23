"""
Browser checks for /tickets (Playwright for Python, Chromium). LOCAL ONLY.
Run: python3 tests/tickets.browser.py
Env (defaults shown): TK_WEB_URL=http://localhost:3100  TK_BACKEND_URL=http://localhost:5071
  TK_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde_test  TK_BACKEND_DIR=/home/claude/outsyde-backend
  TK_SHOTS=<dir for screenshots>  (optional)
Skips (exit 0) when the web or backend server is not up. Needs psql and node on PATH.
"""
import re, json, os, subprocess, sys, time, urllib.request
from urllib.parse import urlparse

WEB = os.environ.get("TK_WEB_URL", "http://localhost:3100")
BACKEND = os.environ.get("TK_BACKEND_URL", "http://localhost:5071")
PG = os.environ.get("TK_PG_URL", "postgresql://outsyde:outsyde@localhost:5432/outsyde_test")
BDIR = os.environ.get("TK_BACKEND_DIR", "/home/claude/outsyde-backend")
SHOTS = os.environ.get("TK_SHOTS")

for u in (WEB, BACKEND, PG):
    if urlparse(u).hostname not in ("localhost", "127.0.0.1", "::1"):
        sys.exit("refusing to run: all URLs must be localhost")

def up(u):
    try:
        urllib.request.urlopen(u, timeout=3); return True
    except Exception as e:
        return hasattr(e, "code")
if not (up(WEB + "/tickets") and up(BACKEND + "/api/events")):
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

def node(code):
    return subprocess.run(["node", "-e", code], capture_output=True, text=True, cwd=BDIR, check=True).stdout.strip()

def tok(uid):
    return node(f'console.log(require("jsonwebtoken").sign({{userId:"{uid}",isVendor:false}},"test",{{expiresIn:"1h"}}))')

def api(method, path, token=None, body=None):
    h = {"Content-Type": "application/json"}
    if token: h["Authorization"] = "Bearer " + token
    rq = urllib.request.Request(BACKEND + path, method=method, headers=h, data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(rq) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        return json.loads(e.read() or b"{}")

P = "tk" + format(int(time.time()), "x")
def mkuser(s):
    return sql(f"INSERT INTO users (id,email,name,first_name,username) VALUES (gen_random_uuid(),'{P}-{s}@test.local','Guest {s} Lastname','Guest{s}','{P}{s}') RETURNING id").splitlines()[0]
def iso(days, hours=0):
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + days * 86400 + hours * 3600))

def accept_agreement(token):
    # Publishing needs the Event Host Agreement (backend gate): accept the current version first.
    ag = api("GET", "/api/events/host-agreement", token)["agreement"]
    return api("POST", "/api/events/host-agreement/accept", token, {"version": ag["version"]})

host, g1, g2 = mkuser("host"), mkuser("g1"), mkuser("g2")
ht, t1, t2 = tok(host), tok(g1), tok(g2)
accept_agreement(ht)

def mkevent(title, body_extra=None):
    body = {"title": f"{P} {title}", "startsAt": iso(10), "endsAt": iso(10, 4), "timezone": "America/Los_Angeles",
            "venueName": "The Hall", "addressLine1": "12 Main St", "city": "Freeport", "state": "NY", "postalCode": "11520", "capacity": 30}
    body.update(body_extra or {})
    ev = api("POST", "/api/events", ht, body)["event"]
    ty = api("POST", f"/api/events/{ev['id']}/ticket-types", ht, {"name": "Free RSVP", "priceCents": 0, "quantity": 10})["ticketType"]
    api("POST", f"/api/events/{ev['id']}/publish", ht)
    return ev, ty

def rsvp(ev, ty, token, key):
    return api("POST", f"/api/events/{ev['id']}/rsvp", token, {"ticketTypeId": ty["id"], "quantity": 1, "idempotencyKey": key})["order"]

def real(errs):
    # Ignore the browser's generic network lines (the refused refund is an expected 409) and the Vercel
    # analytics script, which only exists on Vercel. Anything else, including any other 404, counts.
    return [e for e in errs if not e.startswith("Failed to load resource") and "/_vercel/insights/" not in e]

def new_ctx(browser, token, width):
    ctx = browser.new_context(viewport={"width": width, "height": 900}, accept_downloads=True)
    if token:
        ctx.add_cookies([{"name": "outsyde_access_token", "value": token, "url": WEB}])
    ctx.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
    pg = ctx.new_page()
    errs = []
    pg.on("response", lambda r: errs.append(f"{r.status} {r.url}") if r.status == 404 else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    return ctx, pg, errs

try:
    ev, ty = mkevent("Free Night")
    o1 = rsvp(ev, ty, t1, f"{P}-a")
    tk1 = o1["tickets"][0]
    mine = api("GET", "/api/events/me/tickets", t1)["tickets"][0]
    ev2, ty2 = mkevent("Paid Night", {"refundPolicy": "no_refunds"})
    o2 = rsvp(ev2, ty2, t2, f"{P}-b")
    sql(f"UPDATE ticket_orders SET total_cents=2000, subtotal_cents=2000, host_net_cents=2000, paid_at=now() WHERE id='{o2['id']}'")
    sql(f"UPDATE events SET refund_policy='no_refunds' WHERE id='{ev2['id']}'")
    ev3, ty3 = mkevent("Called Off")
    rsvp(ev3, ty3, t2, f"{P}-c")
    sql(f"UPDATE events SET status='cancelled' WHERE id='{ev3['id']}'")

    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        print("signed out")
        ctx, pg, errs = new_ctx(browser, None, 390)
        pg.goto(WEB + "/tickets")
        pg.wait_for_url("**/login**", timeout=15000)
        check(urlparse(pg.url).path == "/login" and "return=%2Ftickets" in pg.url or "return=/tickets" in pg.url, "ends on /login?return=/tickets", pg.url)
        ctx.close()

        print("signed in, free RSVP (390px)")
        ctx, pg, errs = new_ctx(browser, t1, 390)
        pg.goto(WEB + "/tickets")
        pg.wait_for_selector("img[alt='Ticket QR code']", timeout=15000)
        img = pg.locator("img[alt='Ticket QR code']").first
        check(img.get_attribute("src") == mine["qrUrl"], "QR src equals the ticket's qrUrl", img.get_attribute("src"))
        pg.wait_for_function("() => { const i = document.querySelector(\"img[alt='Ticket QR code']\"); return i && i.complete }", timeout=15000)
        check(img.evaluate("i => i.naturalWidth") > 0, "QR image actually loads (naturalWidth > 0)")
        check(pg.get_by_text(tk1["code"]).count() >= 1, "ticket code shows")
        check(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "390px: no horizontal overflow")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/tickets-390.png", full_page=True)

        with pg.expect_download() as dl:
            pg.get_by_role("button", name="Add to calendar").first.click()
        d = dl.value
        check(d.suggested_filename == ev["slug"] + ".ics", "download is named <slug>.ics", d.suggested_filename)
        body = open(d.path()).read()
        want = time.strftime("%Y%m%dT%H%M%SZ", time.strptime(ev["startsAt"][:19], "%Y-%m-%dT%H:%M:%S"))
        check(f"DTSTART:{want}" in body and f"UID:{tk1['id']}" in body, "ics has DTSTART in UTC and the ticket id", body)

        pg.get_by_role("button", name="Can't make it?").click()
        pg.get_by_role("button", name="Cancel my RSVP").click()
        check(pg.get_by_text(f"Cancel your RSVP for {P} Free Night?").count() == 1, "in-page confirm names the event")
        pg.get_by_role("button", name="Yes, cancel").click()
        pg.get_by_text("Your RSVP is cancelled.").wait_for(timeout=15000)
        check(pg.locator("img[alt='Ticket QR code']").count() == 0, "card is gone after cancelling")
        check(pg.get_by_text("No tickets yet.").count() == 1, "empty state shows")
        check(sql(f"SELECT status FROM ticket_orders WHERE id='{o1['id']}'") == "cancelled", "order is cancelled in the DB")
        check(real(errs) == [], "no console or page errors", errs)
        ctx.close()

        print("signed in, paid ticket with no refunds (1280px)")
        ctx, pg, errs = new_ctx(browser, t2, 1280)
        pg.goto(WEB + "/tickets")
        pg.wait_for_selector("img[alt='Ticket QR code']", timeout=15000)
        check(pg.get_by_text("Event cancelled").count() == 1, "cancelled event card carries an Event cancelled note")
        check(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "1280px: no horizontal overflow")
        card = pg.locator("article", has_text=f"{P} Paid Night")
        card.locator("xpath=following-sibling::div[1]").get_by_role("button", name="Can't make it?").click()
        pg.get_by_role("button", name="Request a refund").click()
        check(pg.get_by_text(f"Request a refund for {P} Paid Night?").count() == 1, "refund confirm names the event")
        pg.get_by_role("button", name="Yes, request refund").click()
        pg.locator(".tk-err").wait_for(timeout=15000)
        msg = pg.locator(".tk-err").inner_text()
        direct = api("POST", f"/api/events/orders/{o2['id']}/refund", t2)
        check(msg.strip() != "" and msg == direct.get("error", {}).get("message", direct.get("error")), "backend refusal message appears", {"page": msg, "backend": direct})
        check(pg.locator("article", has_text=f"{P} Paid Night").count() == 1, "ticket stays after a refused refund")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/tickets-1280.png", full_page=True)
        check(real(errs) == [], "no page errors", errs)
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
