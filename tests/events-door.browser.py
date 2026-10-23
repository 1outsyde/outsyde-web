"""
Browser checks for the door: /events/[id]/team, /events/door and /events/[id]/scan (Playwright for Python, Chromium). LOCAL ONLY.
Run: python3 tests/events-door.browser.py
Env (defaults shown): ED_WEB_URL=http://localhost:3101  ED_BACKEND_URL=http://localhost:5071
  ED_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde_test  ED_BACKEND_DIR=/home/claude/outsyde-backend
  ED_SHOTS=<dir for screenshots>  (optional)
Skips (exit 0) when the web or backend server is not up. Needs psql, node and ffmpeg on PATH.
Seeds a host, a door team member, a second member, two guests and a stranger, and one published free event that
starts in 2 hours (so check in is open: the window opens 6 hours before the start) with one RSVP per guest.
Chromium runs with a fake camera (--use-fake-ui-for-media-stream --use-fake-device-for-media-stream). For the real
decode check, the fake camera plays a video of a QR code made with the backend's own qrcode package
(--use-file-for-fake-video-capture). Runs at 375 px. Cleans up.
"""
import re, json, os, subprocess, sys, tempfile, time, urllib.request
from urllib.parse import urlparse

WEB = os.environ.get("ED_WEB_URL", "http://localhost:3101")
BACKEND = os.environ.get("ED_BACKEND_URL", "http://localhost:5071")
PG = os.environ.get("ED_PG_URL", "postgresql://outsyde:outsyde@localhost:5432/outsyde_test")
BDIR = os.environ.get("ED_BACKEND_DIR", "/home/claude/outsyde-backend")
SHOTS = os.environ.get("ED_SHOTS")
WIDTH = 375

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

def qr_video(text, out_dir, name):
    """A short y4m video of a QR code holding `text`, for Chromium's fake camera."""
    png = os.path.join(out_dir, name + ".png")
    y4m = os.path.join(out_dir, name + ".y4m")
    js = f'require("qrcode").toFile({json.dumps(png)}, {json.dumps(text)}, {{ width: 360, margin: 4 }}, (e) => {{ if (e) {{ console.error(e); process.exit(1); }} }})'
    subprocess.run(["node", "-e", js], cwd=BDIR, check=True, capture_output=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", png, "-t", "2", "-r", "10",
                    "-vf", "scale=640:480:force_original_aspect_ratio=decrease,pad=640:480:(ow-iw)/2:(oh-ih)/2:white,format=yuv420p",
                    y4m], check=True)
    return y4m

P = "ed" + format(int(time.time()), "x")
def iso(hours):
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + hours * 3600))

def real(errs):
    return [e for e in errs if not e.startswith("Failed to load resource") and "/_vercel/insights/" not in e]

def new_ctx(browser, token):
    ctx = browser.new_context(viewport={"width": WIDTH, "height": 860})
    if token:
        ctx.add_cookies([{"name": "outsyde_access_token", "value": token, "url": WEB}])
    ctx.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
    pg = ctx.new_page()
    errs, posts = [], []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("request", lambda r: posts.append(r.url) if r.method == "POST" else None)
    return ctx, pg, errs, posts

def no_overflow(pg):
    return pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth")

def mkuser(slug, first):
    return sql(f"INSERT INTO users (id,email,name,first_name,username) VALUES (gen_random_uuid(),'{P}-{slug}@test.local','{first} Lastname','{first}','{P}{slug}') RETURNING id").splitlines()[0]

FAKE = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
host = mkuser("host", "Hana"); member = mkuser("mem", "Marcus"); member2 = mkuser("mem2", "Nia")
guest = mkuser("gwen", "Gwen"); guest2 = mkuser("kai", "Kai"); stranger = mkuser("stan", "Stan")
users = [host, member, member2, guest, guest2, stranger]
tmp = tempfile.mkdtemp(prefix="door-qr-")

try:
    ht, mt, m2t, gt, g2t, st = (tok(u) for u in users)
    ag = api("GET", "/api/events/host-agreement", ht)["agreement"]
    check(api("POST", "/api/events/host-agreement/accept", ht, {"version": ag["version"]}).get("success") is True, "host agreement accepted")
    title = f"{P} Door Night"
    ev = api("POST", "/api/events", ht, {"title": title, "startsAt": iso(2), "endsAt": iso(6), "timezone": "America/New_York",
             "venueName": "The Hall", "addressLine1": "12 Main St", "city": "Freeport", "state": "NY", "postalCode": "11520", "capacity": 30})["event"]
    eid = ev["id"]
    ty = api("POST", f"/api/events/{eid}/ticket-types", ht, {"name": "Free RSVP", "priceCents": 0, "quantity": 10})["ticketType"]
    check(api("POST", f"/api/events/{eid}/publish", ht).get("success") is True, "event published, starting in 2 hours")
    for t, k in ((gt, "g1"), (g2t, "g2")):
        r = api("POST", f"/api/events/{eid}/rsvp", t, {"ticketTypeId": ty["id"], "quantity": 1, "idempotencyKey": f"{P}-{k}"})
        check(r.get("success") is True, f"RSVP {k}", r)
    code_gwen = sql(f"SELECT code FROM tickets WHERE event_id='{eid}' AND holder_user_id='{guest}'")
    code_kai = sql(f"SELECT code FROM tickets WHERE event_id='{eid}' AND holder_user_id='{guest2}'")
    check(re.fullmatch(r"[A-Z0-9]{16}", code_gwen) is not None and re.fullmatch(r"[A-Z0-9]{16}", code_kai) is not None, "tickets have 16 character codes")
    scan_url = f"{WEB}/events/{eid}/scan"
    team_url = f"{WEB}/events/{eid}/team"
    qr_kai = qr_video(code_kai, tmp, "kai")
    qr_junk = qr_video("hello there", tmp, "junk")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=FAKE)

        # ----- host: door team -----
        print("door team (host)")
        ctx, pg, errs, _ = new_ctx(browser, ht)
        pg.goto(team_url)
        pg.locator("[data-testid=team-add]").wait_for(timeout=20000)
        pg.get_by_text(title, exact=True).wait_for(timeout=10000)
        check(True, "team page shows the event title")
        check("can't see sales, earnings or edit the event" in pg.content(), "explains what the team can do")
        add_btn = pg.get_by_role("button", name="Add to door team")
        check(add_btn.is_disabled(), "Add is disabled until a username is typed")
        user_in = pg.locator("#team-user")
        user_in.fill(f"{P}nobody")
        add_btn.click()
        pg.locator("[data-testid=add-error]").wait_for(timeout=10000)
        check(pg.locator("[data-testid=add-error]").inner_text() == "No active account has that username.", "unknown username shows the backend message", pg.locator("[data-testid=add-error]").inner_text())
        user_in.fill(f"@{P}host")
        add_btn.click()
        pg.wait_for_function("document.querySelector('[data-testid=add-error]')?.textContent === 'You already have full access to your own events.'", timeout=10000)
        check(True, "adding yourself shows the backend message")
        # member, this event only (the default)
        user_in.fill(f"@{P}mem")
        check(pg.get_by_role("radio", name="Only this event").get_attribute("aria-checked") == "true", "scope defaults to Only this event")
        add_btn.click()
        pg.locator("[data-testid=team-event] [data-testid=team-row]").first.wait_for(timeout=10000)
        row = pg.locator("[data-testid=team-event] [data-testid=team-row]").first.inner_text()
        check("Marcus" in row and f"@{P}mem" in row and "access ends when the event ends" in row, "member listed under Only this event", row)
        check(sql(f"SELECT count(*) FROM event_door_members WHERE event_id='{eid}' AND member_user_id='{member}' AND removed_at IS NULL") == "1", "DB: event door member row")
        user_in.fill(f"{P}mem")
        add_btn.click()
        pg.wait_for_function("document.querySelector('[data-testid=add-error]')?.textContent === 'They are already on your door team.'", timeout=10000)
        check(True, "adding again shows already on the team")
        # second member, all my events, then remove with a confirm
        user_in.fill(f"{P}mem2")
        pg.get_by_role("radio", name="All my events").click()
        add_btn.click()
        pg.locator("[data-testid=team-standing] [data-testid=team-row]").first.wait_for(timeout=10000)
        check("Nia" in pg.locator("[data-testid=team-standing]").inner_text(), "second member listed under all events")
        check(no_overflow(pg), f"{WIDTH}px: team page has no horizontal overflow")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/team-{WIDTH}.png", full_page=True)
        pg.locator("[data-testid=team-standing]").get_by_role("button", name="Remove").click()
        conf = pg.get_by_role("group", name="Confirm remove")
        check("stop being able to scan all your events" in conf.inner_text(), "remove asks to confirm", conf.inner_text())
        check(sql(f"SELECT count(*) FROM event_door_team WHERE member_user_id='{member2}' AND removed_at IS NULL") == "1", "not removed before confirming")
        conf.get_by_role("button", name="Yes, remove").click()
        pg.wait_for_function("!document.querySelector('[data-testid=team-standing] [data-testid=team-row]')", timeout=10000)
        check(sql(f"SELECT count(*) FROM event_door_team WHERE member_user_id='{member2}' AND removed_at IS NULL") == "0", "DB: standing member removed")
        check(real(errs) == [], "no console or page errors (team)", errs)
        ctx.close()

        # ----- member: /events/door, scanner, manual entry -----
        print("scanner (door team member)")
        ctx, pg, errs, posts = new_ctx(browser, mt)
        pg.goto(WEB + "/events/door")
        pg.locator("[data-testid=door-row]").first.wait_for(timeout=20000)
        rows = pg.locator("[data-testid=door-row]")
        check(rows.count() == 1 and title in rows.first.inner_text(), "member sees the event on /events/door", rows.first.inner_text())
        check("Door team, this event" in rows.first.inner_text() and "Check in is open." in rows.first.inner_text(), "row shows the role and that check in is open", rows.first.inner_text())
        check("12 Main St" not in pg.content(), "no address on /events/door")
        check(not pg.evaluate("performance.getEntriesByType('resource').some(e => /jsqr/i.test(e.name))"), "/events/door does not load jsQR")
        check(no_overflow(pg), f"{WIDTH}px: /events/door has no horizontal overflow")
        rows.first.click()
        pg.wait_for_url(f"**/events/{eid}/scan", timeout=20000)
        pg.locator("[data-testid=camera]").wait_for(timeout=20000)
        check(pg.locator("[data-testid=counter]").inner_text() == "0 checked in", "counter starts at 0", pg.locator("[data-testid=counter]").inner_text())
        check("of 2 tickets" in pg.content(), "counter shows the total from guests")
        check(title in pg.locator("[data-testid=scan-event]").inner_text(), "scanner header shows the event")
        check(pg.locator("[data-testid=window-note]").count() == 0, "no window note while check in is open")
        pg.get_by_role("button", name="Start camera").click()
        pg.wait_for_function("document.querySelector('[data-testid=camera]')?.dataset.state === 'on'", timeout=20000)
        playing = pg.wait_for_function("(() => { const v = document.querySelector('video'); return v && v.videoWidth > 0 && v.srcObject && v.srcObject.getVideoTracks()[0].readyState === 'live'; })()", timeout=20000)
        check(bool(playing), "camera started with the fake device (live track, frames)")
        v = pg.evaluate("(() => { const v = document.querySelector('video'); return { playsInline: v.playsInline, muted: v.muted }; })()")
        check(v == {"playsInline": True, "muted": True}, "video is playsInline and muted", v)
        check(pg.evaluate("performance.getEntriesByType('resource').some(e => /jsqr/i.test(e.name))"), "jsQR loaded once the camera starts")
        # hidden tab stops the camera, visible again resumes it
        pg.evaluate("Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'))")
        pg.wait_for_function("document.querySelector('[data-testid=camera]')?.dataset.state === 'off'", timeout=10000)
        check(pg.evaluate("document.querySelector('video').srcObject === null"), "hidden tab: camera stopped")
        pg.evaluate("Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange'))")
        pg.wait_for_function("document.querySelector('[data-testid=camera]')?.dataset.state === 'on'", timeout=20000)
        check(True, "visible again: camera resumed")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/scan-{WIDTH}.png", full_page=True)

        # manual entry
        pg.get_by_role("button", name="Type a code").click()
        code_in = pg.locator("#sc-code")
        code_in.fill(code_gwen.lower()[:10])
        check(code_in.input_value() == code_gwen[:10], "typed code is uppercased", code_in.input_value())
        check(pg.get_by_role("button", name="Check in", exact=True).is_disabled(), "Check in disabled until 16 characters")
        code_in.fill(code_gwen.lower())
        pg.get_by_role("button", name="Check in", exact=True).click()
        res = pg.locator("[data-testid=result]")
        res.wait_for(timeout=15000)
        check(res.get_attribute("data-outcome") == "CHECKED_IN", "manual entry: checked in", res.inner_text())
        check("Gwen · Free RSVP" in res.inner_text(), "result shows first name and ticket type", res.inner_text())
        check(pg.get_by_role("button", name="Undo check in").count() == 0, "member sees no Undo on the result")
        check(pg.locator("[data-testid=counter]").inner_text() == "1 checked in", "counter moves to 1")
        check(sql(f"SELECT checked_in_by_user_id FROM tickets WHERE code='{code_gwen}'") == member, "DB: checked in by the member")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/result-ok-{WIDTH}.png", full_page=True)
        check(no_overflow(pg), f"{WIDTH}px: result has no horizontal overflow")
        pg.get_by_role("button", name="Scan next").click()
        # same code again inside 3 seconds is not sent
        n_before = len([u for u in posts if u.endswith("/door/check-in")])
        code_in.fill(code_gwen)
        pg.get_by_role("button", name="Check in", exact=True).click()
        pg.get_by_text("That code was just sent.").wait_for(timeout=5000)
        check(len([u for u in posts if u.endswith("/door/check-in")]) == n_before, "same code within 3 seconds is not sent again")
        pg.wait_for_timeout(3100)
        pg.get_by_role("button", name="Check in", exact=True).click()
        res.wait_for(timeout=15000)
        check(res.get_attribute("data-outcome") == "ALREADY_CHECKED_IN", "second entry: already checked in", res.inner_text())
        check(re.search(r"scanned at \d{1,2}:\d{2} (AM|PM) by Marcus\.", res.inner_text()) is not None, "already checked in shows the time and who", res.inner_text())
        if SHOTS: pg.screenshot(path=f"{SHOTS}/result-used-{WIDTH}.png", full_page=True)
        pg.get_by_role("button", name="Scan next").click()

        # guest list: no Undo for a member, tap to check in
        pg.get_by_role("button", name="Guest list").click()
        pg.locator("[data-testid=scan-guest]").first.wait_for(timeout=10000)
        gl = pg.locator("[data-testid=guest-list]")
        check(gl.get_by_role("button", name="Undo").count() == 0, "member sees no Undo on the guest list")
        pg.locator("#sc-search").fill("kai")
        check(pg.locator("[data-testid=scan-guest]").count() == 1, "search filters the list")
        txt = gl.inner_text()
        check("$" not in txt and "$" not in pg.locator("main").inner_text(), "no money on the scanner", txt)
        check("test.local" not in pg.content() and "Lastname" not in pg.content(), "no email or last name on the scanner")
        check(no_overflow(pg), f"{WIDTH}px: guest list has no horizontal overflow")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/guests-{WIDTH}.png", full_page=True)
        pg.locator("#sc-search").fill("")

        # member can't open the team page (host only)
        pg.goto(team_url)
        pg.locator("[data-testid=not-found]").wait_for(timeout=20000)
        check(True, "member opening the team page sees not found")
        check(real([e for e in errs if "404" not in e]) == [], "no console or page errors (member)", errs)
        ctx.close()
        browser.close()

        # ----- real QR decode through the fake camera -----
        print("camera decode (fake camera playing a QR video)")
        b2 = pw.chromium.launch(args=FAKE + [f"--use-file-for-fake-video-capture={qr_kai}"])
        ctx, pg, errs, posts = new_ctx(b2, mt)
        sends = []
        pg.on("request", lambda r: sends.append(time.monotonic()) if r.method == "POST" and r.url.endswith("/door/check-in") else None)
        pg.goto(scan_url)
        pg.get_by_role("button", name="Start camera").click()
        res = pg.locator("[data-testid=result]")
        res.wait_for(timeout=20000)
        check(res.get_attribute("data-outcome") == "CHECKED_IN" and "Kai · Free RSVP" in res.inner_text(), "camera decoded the QR and checked Kai in", res.inner_text())
        check(sql(f"SELECT checked_in_at IS NOT NULL FROM tickets WHERE code='{code_kai}'") == "t", "DB: Kai checked in")
        pg.wait_for_timeout(1000)
        check(len(sends) == 1, "the QR in view is sent once while the result shows", len(sends))
        pg.get_by_role("button", name="Scan next").click()
        res.wait_for(timeout=10000)
        check(len(sends) == 2 and sends[1] - sends[0] >= 3.0, "Scan next with the same QR in view: sent again only after 3 seconds", [round(t - sends[0], 2) for t in sends])
        check(res.get_attribute("data-outcome") == "ALREADY_CHECKED_IN", "the same QR again shows already checked in", res.get_attribute("data-outcome"))
        check(real(errs) == [], "no console or page errors (camera decode)", errs)
        ctx.close()

        # host Undo from the result card while the same QR stays in front of the camera
        sql(f"UPDATE tickets SET checked_in_at = NULL, checked_in_by_user_id = NULL WHERE code='{code_kai}'")
        ctx, pg, errs, posts = new_ctx(b2, ht)
        sends = []
        pg.on("request", lambda r: sends.append(time.monotonic()) if r.method == "POST" and r.url.endswith("/door/check-in") else None)
        pg.goto(scan_url)
        pg.get_by_role("button", name="Start camera").click()
        res = pg.locator("[data-testid=result]")
        res.wait_for(timeout=20000)
        check(res.get_attribute("data-outcome") == "CHECKED_IN", "host: camera checked Kai in", res.inner_text())
        pg.get_by_role("button", name="Undo check in").click()
        pg.wait_for_function("document.querySelector('[data-testid=result]')?.dataset.outcome === 'UNDONE'", timeout=10000)
        check("Check in undone" in res.inner_text() and "Kai · Free RSVP" in res.inner_text(), "undo shows a Check in undone card for the guest", res.inner_text())
        check(pg.get_by_role("button", name="Scan next").count() == 1, "the undone card has Scan next")
        pg.wait_for_timeout(3600)
        check(len(sends) == 1, "QR still in view: nothing sent for more than 3 seconds after the undo", len(sends))
        check(sql(f"SELECT checked_in_at IS NULL FROM tickets WHERE code='{code_kai}'") == "t", "DB: Kai stays not checked in after the undo")
        check(res.get_attribute("data-outcome") == "UNDONE", "the undone card stays until Scan next")
        pg.get_by_role("button", name="Scan next").click()
        pg.wait_for_function("document.querySelector('[data-testid=result]')?.dataset.outcome === 'CHECKED_IN'", timeout=10000)
        check(len(sends) == 2 and sql(f"SELECT checked_in_at IS NOT NULL FROM tickets WHERE code='{code_kai}'") == "t", "after Scan next the QR in view checks Kai in again")
        check(real(errs) == [], "no console or page errors (host undo with camera)", errs)
        ctx.close()
        b2.close()

        b3 = pw.chromium.launch(args=FAKE + [f"--use-file-for-fake-video-capture={qr_junk}"])
        ctx, pg, errs, posts = new_ctx(b3, mt)
        pg.goto(scan_url)
        pg.get_by_role("button", name="Start camera").click()
        res = pg.locator("[data-testid=result]")
        res.wait_for(timeout=20000)
        check(res.get_attribute("data-outcome") == "INVALID_CODE", "a QR that isn't a ticket code shows Invalid code", res.inner_text())
        check([u for u in posts if "/door/" in u] == [], "invalid QR: nothing sent to the backend", posts)
        check(real(errs) == [], "no console or page errors (invalid QR)", errs)
        ctx.close()
        b3.close()

        # ----- host: Undo on the guest list -----
        print("scanner (host)")
        browser = pw.chromium.launch(args=FAKE)
        ctx, pg, errs, _ = new_ctx(browser, ht)
        pg.goto(scan_url)
        pg.locator("[data-testid=camera]").wait_for(timeout=20000)
        check(pg.locator("[data-testid=counter]").inner_text() == "2 checked in", "host sees 2 checked in", pg.locator("[data-testid=counter]").inner_text())
        pg.get_by_role("button", name="Guest list").click()
        pg.locator("#sc-search").fill("gwen")
        row = pg.locator("[data-testid=scan-guest]").first
        row.get_by_role("button", name="Undo").wait_for(timeout=10000)
        check(re.search(r"In \d{1,2}:\d{2} (AM|PM)", row.inner_text()) is not None, "checked in guest shows the time", row.inner_text())
        row.get_by_role("button", name="Undo").click()
        row.get_by_role("button", name="Check in").wait_for(timeout=10000)
        check(sql(f"SELECT checked_in_at IS NULL FROM tickets WHERE code='{code_gwen}'") == "t", "DB: undo cleared the check in")
        check(pg.locator("[data-testid=counter]").inner_text() == "1 checked in", "counter goes back to 1")
        # tap to check in from the list, then Undo from the result card
        row.get_by_role("button", name="Check in").click()
        res = pg.locator("[data-testid=result]")
        res.wait_for(timeout=10000)
        check(res.get_attribute("data-outcome") == "CHECKED_IN", "tap to check in from the guest list", res.inner_text())
        check(pg.get_by_role("button", name="Back to guest list").count() == 1, "result from the list goes back to the list")
        pg.get_by_role("button", name="Undo check in").click()
        pg.wait_for_function("document.querySelector('[data-testid=result]')?.dataset.outcome === 'UNDONE'", timeout=10000)
        check("Gwen · Free RSVP" in res.inner_text(), "undo from the card shows Check in undone for Gwen", res.inner_text())
        pg.get_by_role("button", name="Back to guest list").click()
        check(sql(f"SELECT checked_in_at IS NULL FROM tickets WHERE code='{code_gwen}'") == "t", "DB: undo from the result card")
        # a future event: the page says when check in opens, and the backend answers check in closed
        ev2 = api("POST", "/api/events", ht, {"title": f"{P} Later Night", "startsAt": iso(72), "endsAt": iso(76), "timezone": "America/New_York", "city": "Freeport", "state": "NY", "capacity": 10})["event"]
        api("POST", f"/api/events/{ev2['id']}/ticket-types", ht, {"name": "Free RSVP", "priceCents": 0, "quantity": 10})
        check(api("POST", f"/api/events/{ev2['id']}/publish", ht).get("success") is True, "future event published")
        pg.goto(f"{WEB}/events/{ev2['id']}/scan")
        note = pg.locator("[data-testid=window-note]")
        note.wait_for(timeout=20000)
        check(re.fullmatch(r"Check in opens \w{3}, \w{3} \d{1,2} at \d{1,2}:\d{2} (AM|PM), 6 hours before the start\.", note.inner_text()) is not None, "future event: note says when check in opens", note.inner_text())
        pg.get_by_role("button", name="Type a code").click()
        pg.locator("#sc-code").fill(code_gwen)
        pg.get_by_role("button", name="Check in", exact=True).click()
        res.wait_for(timeout=10000)
        check(res.get_attribute("data-outcome") == "CHECKIN_CLOSED" and "Check in isn't open for this event right now." in res.inner_text(), "outside the window: backend message shown", res.inner_text())
        # after the event ends /door/mine drops it: the host is still known through /manage, so Undo stays
        sql(f"UPDATE events SET starts_at = now() - interval '5 hours', ends_at = now() - interval '1 hour' WHERE id='{eid}'")
        pg.goto(scan_url)
        note = pg.locator("[data-testid=window-note]")
        note.wait_for(timeout=20000)
        check(note.inner_text() == "Check in has closed for this event.", "ended event: closed note", note.inner_text())
        check(title in pg.locator("[data-testid=scan-event]").inner_text(), "ended event: header from /manage")
        check(pg.locator("[data-testid=zone-note]").count() == 0, "ended event: event zone known, no browser zone label")
        pg.get_by_role("button", name="Guest list").click()
        pg.locator("#sc-search").fill("kai")
        check(pg.locator("[data-testid=scan-guest]").first.get_by_role("button", name="Undo").count() == 1, "ended event: host still has Undo")
        check(real(errs) == [], "no console or page errors (host)", errs)
        ctx.close()

        # ----- stranger -----
        print("stranger")
        ctx, pg, errs, _ = new_ctx(browser, st)
        pg.goto(scan_url)
        pg.locator("[data-testid=not-found]").wait_for(timeout=20000)
        check("Event not found" in pg.locator("[data-testid=not-found]").inner_text(), "stranger sees not found on the scanner")
        check(title not in pg.content(), "stranger does not see the title")
        check(no_overflow(pg), f"{WIDTH}px: not found has no horizontal overflow")
        pg.goto(team_url)
        pg.locator("[data-testid=not-found]").wait_for(timeout=20000)
        check(True, "stranger sees not found on the team page")
        pg.goto(f"{WEB}/events/not-a-uuid/scan")
        pg.locator("[data-testid=not-found]").wait_for(timeout=20000)
        check(True, "bad id shows not found")
        pg.goto(WEB + "/events/door")
        pg.get_by_text("NOTHING TO SCAN").wait_for(timeout=20000)
        check(True, "stranger's /events/door is empty")
        check(real([e for e in errs if "404" not in e]) == [], "no console or page errors (stranger)", errs)
        ctx.close()

        # ----- signed out -----
        ctx, pg, errs, _ = new_ctx(browser, None)
        pg.goto(scan_url)
        pg.wait_for_url("**/login**", timeout=20000)
        check(re.search(r"return=(%2F|/)events(%2F|/)" + eid + r"(%2F|/)scan", pg.url) is not None, "signed out scanner goes to login with return", pg.url)
        ctx.close()
        browser.close()
finally:
    ev_ids = f"SELECT id FROM events WHERE host_user_id='{host}'"
    ulist = ",".join(f"'{u}'" for u in users)
    for stmt in (
        f"DELETE FROM event_door_members WHERE event_id IN ({ev_ids})",
        f"DELETE FROM event_door_team WHERE host_user_id='{host}'",
        f"DELETE FROM tickets WHERE event_id IN ({ev_ids})",
        f"DELETE FROM ticket_order_items WHERE order_id IN (SELECT id FROM ticket_orders WHERE event_id IN ({ev_ids}))",
        f"DELETE FROM ticket_orders WHERE event_id IN ({ev_ids})",
        f"DELETE FROM ticket_account_counts WHERE ticket_type_id IN (SELECT id FROM ticket_types WHERE event_id IN ({ev_ids}))",
        f"DELETE FROM ticket_types WHERE event_id IN ({ev_ids})",
        f"DELETE FROM events WHERE host_user_id='{host}'",
        f"DELETE FROM host_agreement_acceptances WHERE user_id='{host}'",
        f"DELETE FROM notifications WHERE user_id IN ({ulist})",
        f"DELETE FROM users WHERE email LIKE '{P}-%'",
    ):
        try:
            sql(stmt)
        except Exception as e:
            print("  cleanup failed:", str(e)[:200])
    left = sql(f"SELECT count(*) FROM users WHERE email LIKE '{P}-%'")
    print(f"  cleanup: {left} test users left")

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
