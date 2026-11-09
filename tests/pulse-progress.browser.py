"""
Browser checks for the Pulse progress bar (Pulse length step C2). LOCAL ONLY, Playwright for Python, Chromium.
Run: python3 tests/pulse-progress.browser.py      Env: PP_WEB_URL=http://localhost:3101  PP_SHOTS= (folder for screenshots)
Needs only the web dev server (no backend): the Pulse feed, /api/auth/me and engagement are answered in the
browser. Makes two test videos with ffmpeg (90 s and 30 s, needs ffmpeg on PATH) under public/__pulse_progress_test/
for the run only; the folder is removed at the end. Skips (exit 0) when the web server is not up.
"""
import json, os, re, shutil, subprocess, sys, urllib.request
from urllib.parse import urlparse

WEB = os.environ.get("PP_WEB_URL", "http://localhost:3101")
SHOTS = os.environ.get("PP_SHOTS", "")
if urlparse(WEB).hostname not in ("localhost", "127.0.0.1", "::1"):
    sys.exit("refusing to run: the web URL must be localhost")
try:
    urllib.request.urlopen(WEB + "/discover/pulse", timeout=5)
except Exception:
    print("skipped: web server is not up"); sys.exit(0)
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print("skipped: playwright for python not installed"); sys.exit(0)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_TEST = os.path.join(ROOT, "public", "__pulse_progress_test")
PULSE = "section[aria-label='Pulse videos']"
passed = failed = 0

def check(ok, name, detail=""):
    global passed, failed
    if ok: passed += 1; print(f"  ok  {name}")
    else: failed += 1; print(f"  FAIL {name} {detail}")

def make_mp4(name, seconds):
    os.makedirs(PUBLIC_TEST, exist_ok=True)
    out = os.path.join(PUBLIC_TEST, name)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=180x320:rate=10",
                        "-t", str(seconds), "-c:v", "libx264", "-profile:v", "baseline", "-pix_fmt", "yuv420p", "-g", "10",
                        "-movflags", "+faststart", out], capture_output=True, text=True)
    if r.returncode: raise RuntimeError("ffmpeg failed: " + r.stderr[:300])
    return f"{WEB}/__pulse_progress_test/{name}"

def video(i, url):
    return {"id": f"00000000-0000-4000-8000-00000000000{i}", "videoUrl": url, "caption": f"Test video {i}",
            "author": {"userId": f"u{i}", "username": f"maker{i}", "displayName": f"Maker {i}", "role": "consumer"},
            "likeCount": 3, "commentCount": 1}

def shot(pg, name):
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.screenshot(path=os.path.join(SHOTS, name))

def item(pg, i):
    return pg.locator(f"{PULSE} > article").nth(i)

def vtime(pg, i):
    return pg.evaluate("([sel, i]) => document.querySelectorAll(sel + ' > article')[i].querySelector('video').currentTime", [PULSE, i])

def vpaused(pg, i):
    return pg.evaluate("([sel, i]) => document.querySelectorAll(sel + ' > article')[i].querySelector('video').paused", [PULSE, i])

def feed_top(pg):
    return pg.evaluate("(sel) => document.querySelector(sel).scrollTop", PULSE)

try:
    long_url = make_mp4("long.mp4", 90)
    short_url = make_mp4("short.mp4", 30)
    engagements = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True)
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.route("**/api/auth/me", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"authenticated": False})))
        pg.route(re.compile(r"/api/discover/pulse(\?|$)"), lambda r: r.fulfill(status=200, content_type="application/json",
                 body=json.dumps({"data": {"videos": [video(1, long_url), video(2, short_url)], "nextCursor": None, "hasMore": False}})))
        pg.route(re.compile(r"/api/discover/pulse/engagement$"), lambda r: (engagements.append(r.request.post_data), r.fulfill(status=200, body="{}")))
        pg.goto(WEB + "/discover/pulse")
        pg.wait_for_function("(sel) => document.querySelectorAll(sel + ' > article video').length >= 1", arg=PULSE, timeout=60000)
        # Autoplay is muted; wait for the 90 s video to play a moment and report its length.
        pg.wait_for_function("(sel) => { const v = document.querySelector(sel + ' > article video'); return v && v.duration > 60 && v.currentTime > 0.5; }", arg=PULSE, timeout=30000)

        print("== 90 s video")
        bar = item(pg, 0).locator("[data-testid='pulse-progress']")
        bar.wait_for(timeout=10000)
        check(bar.is_visible(), "bar shows on a video over 60 s")
        check(bar.get_attribute("role") == "slider" and bar.get_attribute("aria-valuemax") == "90", "slider with 90 s length", bar.get_attribute("aria-valuemax"))
        shot(pg, "1-bar.png")

        box = bar.bounding_box()
        y = box["y"] + box["height"] - 9
        top_before = feed_top(pg)
        pg.mouse.move(box["x"] + box["width"] * 0.1, y)
        pg.mouse.down()
        pg.mouse.move(box["x"] + box["width"] * 0.3, y, steps=4)
        pg.mouse.move(box["x"] + box["width"] * 0.5, y + 30, steps=4)  # a bit diagonal on purpose
        pg.wait_for_timeout(150)
        check(item(pg, 0).locator("[data-testid='pulse-progress-time']").is_visible(), "time readout shows while dragging")
        txt = item(pg, 0).locator("[data-testid='pulse-progress-time']").inner_text()
        check(txt.startswith("0:4") and txt.endswith("1:30"), "readout near 0:45 / 1:30", txt)
        check(vpaused(pg, 0), "video pauses while dragging")
        op = pg.evaluate("(sel) => getComputedStyle(document.querySelector(sel + ' > article [class*=pulseInfo]')).opacity", PULSE)
        pg.wait_for_timeout(250)
        op = pg.evaluate("(sel) => getComputedStyle(document.querySelector(sel + ' > article [class*=pulseInfo]')).opacity", PULSE)
        check(op == "0", "name and caption fade while dragging", op)
        shot(pg, "2-dragging.png")
        pg.mouse.up()
        pg.wait_for_timeout(400)
        t = vtime(pg, 0)
        check(44 <= t <= 47, "released at the middle: video jumps to ~45 s", t)
        check(not vpaused(pg, 0), "plays again after the drag")
        check(feed_top(pg) == top_before, "feed did not scroll during the drag", f"{top_before} -> {feed_top(pg)}")
        op = pg.evaluate("(sel) => getComputedStyle(document.querySelector(sel + ' > article [class*=pulseInfo]')).opacity", PULSE)
        pg.wait_for_timeout(250)
        op = pg.evaluate("(sel) => getComputedStyle(document.querySelector(sel + ' > article [class*=pulseInfo]')).opacity", PULSE)
        check(op == "1", "name and caption come back", op)

        print("click to jump, touch drag, keys")
        pg.mouse.click(box["x"] + box["width"] * 0.8, y)
        pg.wait_for_timeout(400)
        t = vtime(pg, 0)
        check(71 <= t <= 74, "click at 80% jumps to ~72 s", t)
        check(not vpaused(pg, 0), "a click on the bar doesn't pause the video")
        bar.focus()
        before = vtime(pg, 0)
        pg.keyboard.press("ArrowLeft")
        pg.wait_for_timeout(300)
        after = vtime(pg, 0)
        check(before - 6.5 <= after <= before - 3.5, "left arrow skips back 5 s", f"{before:.1f} -> {after:.1f}")
        check(feed_top(pg) == top_before, "keys didn't scroll the feed")

        # Paused by a tap stays paused after a drag.
        pg.mouse.click(box["x"] + box["width"] / 2, box["y"] - 200)  # tap the video surface
        pg.wait_for_timeout(500)
        check(vpaused(pg, 0), "tap on the video pauses it")
        pg.mouse.move(box["x"] + box["width"] * 0.2, y); pg.mouse.down()
        pg.mouse.move(box["x"] + box["width"] * 0.25, y, steps=3); pg.mouse.up()
        pg.wait_for_timeout(400)
        check(vpaused(pg, 0), "a paused video stays paused after a drag")
        check(17 <= vtime(pg, 0) <= 24, "and still jumps (~22 s)", vtime(pg, 0))

        print("== 30 s video")
        pg.evaluate("(sel) => { const s = document.querySelector(sel); s.scrollTo({ top: s.clientHeight, behavior: 'instant' }); }", PULSE)
        pg.wait_for_function("(sel) => { const a = document.querySelectorAll(sel + ' > article')[1]; const v = a && a.querySelector('video'); return v && v.duration > 0 && v.currentTime > 0.5; }", arg=PULSE, timeout=30000)
        pg.wait_for_timeout(500)
        check(item(pg, 1).locator("[data-testid='pulse-progress']").count() == 0, "no bar on a 30 s video")
        check(item(pg, 0).locator("[data-testid='pulse-progress']").count() == 0, "bar hides when its video scrolls away")
        shot(pg, "3-short.png")
        check(not errs, "no page errors", errs)
        ctx.close()

        print("== signed in: dragging back is not a rewatch")
        ctx = browser.new_context(viewport={"width": 390, "height": 844})
        pg = ctx.new_page()
        pg.route("**/api/auth/me", lambda r: r.fulfill(status=200, content_type="application/json",
                 body=json.dumps({"authenticated": True, "user": {"id": "viewer-1", "username": "viewer"}})))
        pg.route(re.compile(r"/api/discover/pulse(\?|$)"), lambda r: r.fulfill(status=200, content_type="application/json",
                 body=json.dumps({"data": {"videos": [video(1, long_url), video(2, short_url)], "nextCursor": None, "hasMore": False}})))
        pg.route(re.compile(r"/api/discover/pulse/engagement$"), lambda r: (engagements.append(json.loads(r.request.post_data or "{}")), r.fulfill(status=200, content_type="application/json", body="{}")))
        pg.route(re.compile(r"/api/(follow|users|discover/follow)"), lambda r: r.fulfill(status=200, content_type="application/json", body="{}"))
        pg.goto(WEB + "/discover/pulse")
        pg.wait_for_function("(sel) => { const v = document.querySelector(sel + ' > article video'); return v && v.duration > 60 && v.currentTime > 0.5; }", arg=PULSE, timeout=30000)
        bar = item(pg, 0).locator("[data-testid='pulse-progress']")
        bar.wait_for(timeout=10000)
        box = bar.bounding_box(); y = box["y"] + box["height"] - 9
        pg.mouse.click(box["x"] + box["width"] * 0.6, y)   # jump forward to ~54 s
        pg.wait_for_timeout(1500)
        pg.mouse.click(box["x"] + box["width"] * 0.1, y)   # then back to ~9 s
        pg.wait_for_timeout(1500)
        pg.evaluate("(sel) => { const s = document.querySelector(sel); s.scrollTo({ top: s.clientHeight, behavior: 'instant' }); }", PULSE)
        pg.wait_for_timeout(1500)
        first = [e for e in engagements if e.get("postId", "").endswith("1")]
        check(len(first) >= 1, "watch time sent when the video scrolls away", engagements)
        check(bool(first) and first[0].get("isRewatch") is False, "jumping back with the bar is not counted as a rewatch", first)
        check(bool(first) and first[0].get("videoDurationMs") == 90000, "length sent as 90 s", first)
        ctx.close()
        browser.close()
finally:
    shutil.rmtree(PUBLIC_TEST, ignore_errors=True)

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
