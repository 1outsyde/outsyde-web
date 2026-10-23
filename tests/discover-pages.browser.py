"""
Browser checks for the Discover pages (Playwright for Python, Chromium). LOCAL ONLY.
Run: python3 tests/discover-pages.browser.py
Env (defaults shown): DP_WEB_URL=http://localhost:3101  DP_BACKEND_URL=http://localhost:5071
  DP_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde_test  DP_BACKEND_DIR=/home/claude/1outsyde/outsyde-backend
Skips (exit 0) when the web or backend server is not up. Needs psql and node on PATH.
Seeds users, posts and a story with SQL, and one published free event through the local backend (create,
free ticket type, accept the host agreement, publish). Removes everything it created.
Sections: Pro (/discover), Following (/discover/following). Task 8 adds Pulse.
"""
import re, json, os, subprocess, sys, time, urllib.request
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from discover_auth import auth_cookies, mint_token  # noqa: E402

WEB = os.environ.get("DP_WEB_URL", "http://localhost:3101")
BACKEND = os.environ.get("DP_BACKEND_URL", "http://localhost:5071")
PG = os.environ.get("DP_PG_URL", "postgresql://outsyde:outsyde@localhost:5432/outsyde_test")
BDIR = os.environ.get("DP_BACKEND_DIR", "/home/claude/1outsyde/outsyde-backend")

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

def api(method, path, token=None, body=None):
    h = {"Content-Type": "application/json"}
    if token: h["Authorization"] = "Bearer " + token
    rq = urllib.request.Request(BACKEND + path, method=method, headers=h, data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(rq) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        return json.loads(e.read() or b"{}")

P = "dp" + format(int(time.time()), "x")
PIXEL = WEB + "/outsyde-y-transparent.png"  # an existing file in public/, served by the web dev server
def iso(days, hours=0):
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + days * 86400 + hours * 3600))

def real(errs):
    return [e for e in errs if not e.startswith("Failed to load resource") and "/_vercel/insights/" not in e]

def new_ctx(browser, cookies=None, width=1280, **kw):
    ctx = browser.new_context(viewport={"width": width, "height": 900}, **kw)
    if cookies:
        ctx.add_cookies(cookies)
    ctx.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
    pg = ctx.new_page()
    errs, reqs = [], []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("request", lambda r: reqs.append(r.url))
    return ctx, pg, errs, reqs

FEED = "section[aria-label='Posts']"
def feed_kinds(pg):
    """Direct children of the feed in order: 'post' for an article, the href for an event card link."""
    return pg.evaluate("""(sel) => Array.from(document.querySelector(sel).children).map(
        (n) => n.tagName === 'ARTICLE' ? 'post' : (n.getAttribute('href') || n.tagName))""", FEED)

def wait_posts(pg, n):
    pg.wait_for_function("([sel, n]) => document.querySelectorAll(sel + ' > article').length >= n", arg=[FEED, n], timeout=60000)

def post(pg, caption):
    return pg.locator(f"{FEED} > article").filter(has_text=caption)

created_users, sids = [], []
def user(tag, name):
    uid = sql(f"INSERT INTO users (id,email,name,username) VALUES (gen_random_uuid(),'{P}-{tag}@test.local','{name}','{P}{tag}') RETURNING id").splitlines()[0]
    created_users.append(uid)
    return uid

def seed_post(uid, caption, minutes_ago):
    return sql(f"""INSERT INTO feed_posts (author_id, author_type, post_type, content, image_url, media_url, media_type, created_at, updated_at)
        VALUES ('{uid}','consumer','image','{caption}','{PIXEL}','{PIXEL}','image', now() - interval '{minutes_ago} minutes', now())
        RETURNING id""").splitlines()[0]

# ---------------------------------------------------------------------------------------------------------------
def section_pro(browser):
    print("== Pro (/discover)")
    viewer = user("v", "Disc Viewer")
    alice = user("a", "Alice Poster")
    bob = user("b", "Bob Poster")
    host = user("h", "Event Host")
    # 10 posts by others (Alice 0-4, Bob 5-9), 2 by the viewer, oldest for the viewer so the backend would not put them first.
    for i in range(10):
        seed_post(alice if i < 5 else bob, f"{P} other {i}", 10 + i)
    for i in range(2):
        seed_post(viewer, f"{P} mine {i}", 200 + i)
    story = sql(f"""INSERT INTO stories (author_id, media_url, media_type, expires_at)
        VALUES ('{alice}','{PIXEL}','image', now() + interval '1 day') RETURNING id""").splitlines()[0]

    ht = mint_token(BDIR, host)
    title = f"{P} Feed Night"
    ev = api("POST", "/api/events", ht, {"title": title, "startsAt": iso(1), "endsAt": iso(1, 4), "timezone": "America/New_York",
            "venueName": "The Hall", "addressLine1": "12 Main St", "city": "Freeport", "state": "NY", "postalCode": "11520", "capacity": 30})["event"]
    api("POST", f"/api/events/{ev['id']}/ticket-types", ht, {"name": "Free RSVP", "priceCents": 0, "quantity": 10})
    ag = api("GET", "/api/events/host-agreement", ht)["agreement"]
    api("POST", "/api/events/host-agreement/accept", ht, {"version": ag["version"]})
    pub = api("POST", f"/api/events/{ev['id']}/publish", ht)
    check(pub.get("success") is True, "seeded event is published", pub)
    ev_href = f"/e/{ev['slug']}"

    # ---- signed out
    print("signed out")
    ctx, pg, errs, reqs = new_ctx(browser)
    resp = pg.goto(WEB + "/discover")
    check(resp is not None and resp.status == 200, "/discover returns 200", resp and resp.status)
    check(pg.title() == "Discover | Outsyde", "page title", pg.title())
    wait_posts(pg, 12)
    nav = pg.get_by_role("navigation", name="Discover")
    cur = nav.locator("a[aria-current='page']")
    check(cur.count() == 1 and cur.inner_text().strip() == "Pro", "tab row: Pro is current", cur.count())
    check(nav.get_by_role("link", name="Events").locator("svg").count() == 1, "tab row: Events tab has its icon")
    check(pg.locator(f"link[rel='stylesheet'][href*='fonts.googleapis.com']").count() >= 1, "fonts stylesheet linked")
    kinds = feed_kinds(pg)
    check(kinds[:4] == ["post"] * 4 and len(kinds) > 4 and kinds[4] == ev_href, "first event card sits after the 4th post and links to /e/<slug>", kinds[:6])
    card = pg.locator(f"{FEED} > a[href='{ev_href}']")
    ctext = card.inner_text() if card.count() else ""
    check(title in ctext and "EVENT" in ctext and "Get tickets" in ctext and "Free RSVP" in ctext, "event card shows title, EVENT tag, price and Get tickets", ctext)
    check("Hosting an event" in ctext, "event card header says Hosting an event", ctext)
    check("12 Main St" not in pg.content(), "no street address on the page")
    ev_reqs = [r for r in reqs if "/api/events?" in r]
    check(len(ev_reqs) == 1 and "limit=20" in ev_reqs[0] and "from=" in ev_reqs[0] and "to=" in ev_reqs[0], "one events call with from, to and limit=20", ev_reqs)
    check(not any("lat=" in r for r in ev_reqs), "no location on the events call without permission", ev_reqs)
    # stories
    sb = pg.locator("section[aria-label='Stories']")
    check(sb.count() == 1, "stories bar shows")
    check(sb.get_by_text("You", exact=True).count() == 0, "signed out: no You slot")
    sb.get_by_role("button", name=re.compile("Alice Poster")).click()
    dlg = pg.get_by_role("dialog", name=re.compile("Alice Poster"))
    dlg.wait_for(timeout=10000)
    check(dlg.locator(f"img[src='{PIXEL}']").count() >= 1, "story viewer shows the image")
    check(all(dlg.get_by_role("button", name=n).count() == 1 for n in ("Close story", "Previous story", "Next story")), "story viewer has close, previous and next buttons")
    pg.keyboard.press("Escape")
    dlg.wait_for(state="detached", timeout=5000)
    check(True, "Escape closes the story viewer")
    pg.wait_for_timeout(300)
    check(sql(f"SELECT count(*) FROM story_views WHERE story_id='{story}'") == "0", "signed out: no story view recorded")
    # like opens the sign-in prompt
    post(pg, f"{P} other 0").get_by_role("button", name="Like").click()
    d = pg.get_by_role("dialog", name="Sign in")
    d.wait_for(timeout=5000)
    check("Please sign in to like posts." in d.inner_text(), "like opens the sign-in prompt", d.inner_text())
    pg.get_by_role("button", name="Close", exact=True).click()
    check(pg.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), "1280px: no horizontal scroll")
    check(real(errs) == [], "no console or page errors", errs)
    ctx.close()

    print("390px")
    ctx, pg, errs, reqs = new_ctx(browser, width=390)
    pg.goto(WEB + "/discover")
    wait_posts(pg, 12)
    check(pg.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), "390px: no horizontal scroll")
    ctx.close()

    # ---- feed error, then retry
    print("feed error")
    ctx, pg, errs, reqs = new_ctx(browser)
    ctx.route("**/api/discover/feed**", lambda r: r.fulfill(status=500, content_type="application/json", body='{"success":false}'))
    pg.goto(WEB + "/discover")
    pg.get_by_text("Couldn't load posts. Try again.").wait_for(timeout=60000)
    check(True, "feed error shows the error line")
    ctx.unroute("**/api/discover/feed**")
    pg.get_by_role("button", name="Retry").click()
    wait_posts(pg, 12)
    check(pg.get_by_text("Couldn't load posts. Try again.").count() == 0, "Retry loads the posts")
    ctx.close()

    # ---- events route fails
    print("events fail")
    ctx, pg, errs, reqs = new_ctx(browser)
    ctx.route(re.compile(r"/api/events\?"), lambda r: r.fulfill(status=500, content_type="application/json", body='{"success":false}'))
    pg.goto(WEB + "/discover")
    wait_posts(pg, 12)
    pg.wait_for_timeout(500)
    check(pg.locator(f"{FEED} > a[href^='/e/']").count() == 0, "events 500: no event cards")
    check(pg.locator("main [role=alert]").count() == 0 and "Couldn't load" not in pg.inner_text("body") and "went wrong" not in pg.inner_text("body"),
          "events 500: posts render with no error text")
    ctx.close()

    # ---- location already granted
    print("location granted")
    ctx, pg, errs, reqs = new_ctx(browser, permissions=["geolocation"], geolocation={"latitude": 40.6576, "longitude": -73.5832})
    pg.goto(WEB + "/discover")
    wait_posts(pg, 12)
    pg.wait_for_function("() => performance.getEntriesByType('resource').some((e) => e.name.includes('/api/events?'))", timeout=15000)
    ev_reqs = [r for r in reqs if "/api/events?" in r]
    check(len(ev_reqs) == 1 and "lat=" in ev_reqs[0] and "lng=" in ev_reqs[0] and "radiusKm=40" in ev_reqs[0], "granted: events call has lat, lng, radiusKm=40", ev_reqs)
    ctx.close()

    # ---- signed in
    print("signed in")
    cookies, sid = auth_cookies(sql, BDIR, viewer, WEB)
    sids.append(sid)
    ctx, pg, errs, reqs = new_ctx(browser, cookies)
    pg.goto(WEB + "/discover")
    wait_posts(pg, 12)
    arts = pg.locator(f"{FEED} > article")
    check(f"{P} mine" in arts.nth(0).inner_text() and f"{P} mine" in arts.nth(1).inner_text(), "viewer's 2 posts come first")
    sb = pg.locator("section[aria-label='Stories']")
    check(sb.get_by_text("You", exact=True).count() == 1, "signed in: You slot in the stories bar")
    check(sb.locator("a").count() == 0, "You slot is not a link")
    sb.get_by_role("button", name=re.compile("Alice Poster")).click()
    pg.get_by_role("dialog", name=re.compile("Alice Poster")).wait_for(timeout=10000)
    ok = False
    for _ in range(20):
        if sql(f"SELECT count(*) FROM story_views WHERE story_id='{story}' AND viewer_id='{viewer}'") == "1":
            ok = True; break
        pg.wait_for_timeout(250)
    check(ok, "signed in: story view recorded")
    pg.get_by_role("button", name="Close story").click()
    pg.get_by_role("dialog", name=re.compile("Alice Poster")).wait_for(state="detached", timeout=5000)

    # like
    target = post(pg, f"{P} other 0")
    target.get_by_role("button", name="Like").click()
    target.get_by_text("1 like", exact=True).wait_for(timeout=10000)
    heart = target.get_by_role("button", name="Like")
    check(heart.get_attribute("aria-pressed") == "true" and heart.locator("svg").get_attribute("fill") == "#FF3B30", "like turns the heart red")
    pg.wait_for_timeout(500)
    pg.reload()
    wait_posts(pg, 12)
    target = post(pg, f"{P} other 0")
    check(target.get_by_text("1 like", exact=True).count() == 1 and target.get_by_role("button", name="Like").get_attribute("aria-pressed") == "true", "like survives a reload")

    # comments
    target.get_by_role("button", name="Comment", exact=True).click()
    cd = pg.get_by_role("dialog", name="Comments")
    cd.wait_for(timeout=10000)
    cd.get_by_role("textbox", name="Add a comment").fill("Nice.")
    cd.get_by_role("button", name="Send").click()
    cd.get_by_text("Nice.", exact=True).wait_for(timeout=10000)
    pg.wait_for_function("() => !document.body.innerText.includes('Posting')", timeout=10000)
    check(cd.get_by_text("Nice.", exact=True).count() == 1, "posted comment shows", [cd.inner_text()])
    pg.reload()
    wait_posts(pg, 12)
    post(pg, f"{P} other 0").get_by_role("button", name="Comment", exact=True).click()
    cd = pg.get_by_role("dialog", name="Comments")
    cd.get_by_text("Nice.", exact=True).wait_for(timeout=10000)
    check(True, "comment is still listed after a reload")
    pg.keyboard.press("Escape")
    cd.wait_for(state="detached", timeout=5000)

    # follow flips every card by the author
    a_cards = pg.locator(f"{FEED} > article").filter(has_text=re.compile(rf"{P} other [0-4](?![0-9])"))
    b_cards = pg.locator(f"{FEED} > article").filter(has_text=re.compile(rf"{P} other [5-9](?![0-9])"))
    check(a_cards.count() == 5, "five cards by Alice", a_cards.count())
    a_cards.nth(0).get_by_role("button", name="Follow", exact=True).click()
    pg.wait_for_function(f"""() => Array.from(document.querySelectorAll("{FEED} > article"))
        .filter((a) => /{P} other [0-4](?![0-9])/.test(a.innerText))
        .every((a) => Array.from(a.querySelectorAll('button')).some((b) => b.innerText.trim() === 'Following'))""", timeout=10000)
    check(True, "Follow on one card flips every card by that author")
    check(all(b_cards.nth(i).get_by_role("button", name="Follow", exact=True).count() == 1 for i in range(b_cards.count())), "other authors' cards still say Follow")
    ok = False
    for _ in range(20):
        if sql(f"SELECT count(*) FROM follows WHERE follower_user_id='{viewer}' AND target_user_id='{alice}'") == "1":
            ok = True; break
        pg.wait_for_timeout(250)
    check(ok, "follow saved on the server")

    feed_reqs = [r for r in reqs if "/api/discover/feed" in r]
    check(len(feed_reqs) >= 1 and not any("lat=" in r or "lng=" in r for r in feed_reqs), "no feed request carries lat=", feed_reqs)
    check(real(errs) == [], "no console or page errors", errs)
    ctx.close()


# ---------------------------------------------------------------------------------------------------------------
def section_following(browser):
    print("== Following (/discover/following)")
    viewer = user("fv", "Follow Viewer")
    loner = user("fl", "Follow Loner")
    author = user("fa", "Followed Author")
    for i in range(35):
        seed_post(author, f"{P} fa {i}", 10 + i)
    sql(f"INSERT INTO follows (follower_user_id, target_user_id) VALUES ('{viewer}','{author}')")

    def art_count(pg):
        return pg.evaluate("(sel) => document.querySelectorAll(sel + ' > article').length", FEED)

    # ---- signed out: prompt, link, and no feed request
    print("signed out")
    ctx, pg, errs, reqs = new_ctx(browser)
    resp = pg.goto(WEB + "/discover/following")
    check(resp is not None and resp.status == 200, "/discover/following returns 200", resp and resp.status)
    check(pg.title() == "Following | Outsyde", "page title", pg.title())
    pg.get_by_text("Sign in to see posts from people you follow.").wait_for(timeout=60000)
    check(True, "signed out: sign-in text shows")
    link = pg.get_by_role("link", name="Sign in", exact=True)
    check(link.count() == 1 and link.get_attribute("href") == "/login?return=/discover/following", "signed out: Sign in link to login with return", link.count())
    pg.wait_for_timeout(1000)
    check(not any("/api/discover/feed" in r for r in reqs), "signed out: zero requests to /api/discover/feed", [r for r in reqs if "/api/discover/feed" in r])
    nav = pg.get_by_role("navigation", name="Discover")
    cur = nav.locator("a[aria-current='page']")
    check(cur.count() == 1 and cur.inner_text().strip() == "Following", "tab row: Following is current", cur.count())
    check(pg.locator("link[rel='stylesheet'][href*='fonts.googleapis.com']").count() >= 1, "fonts stylesheet linked")
    check(real(errs) == [], "signed out: no console or page errors", errs)
    ctx.close()

    # ---- signed in, following one author with 35 posts
    print("signed in, following an author")
    cookies, sid = auth_cookies(sql, BDIR, viewer, WEB)
    sids.append(sid)
    ctx, pg, errs, reqs = new_ctx(browser, cookies)
    pg.goto(WEB + "/discover/following")
    wait_posts(pg, 30)
    pg.wait_for_timeout(300)
    check(art_count(pg) == 30, "30 posts render first", art_count(pg))
    feed_reqs = lambda: [r for r in reqs if "/api/discover/feed" in r]
    check(len(feed_reqs()) == 1 and "scope=following" in feed_reqs()[0] and "limit=30" in feed_reqs()[0] and "offset=" not in feed_reqs()[0],
          "first request: scope=following, limit=30, no offset", feed_reqs())
    check(not any("lat=" in r or "lng=" in r or "city=" in r for r in feed_reqs()), "no location on the feed call", feed_reqs())
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    wait_posts(pg, 35)
    pg.wait_for_timeout(300)
    caps = pg.evaluate("""([sel, p]) => Array.from(document.querySelectorAll(sel + ' > article')).map((a) => {
        const m = a.innerText.match(new RegExp(p + ' fa [0-9]+')); return m ? m[0] : null; })""", [FEED, P])
    check(art_count(pg) == 35, "scrolling to the bottom loads 5 more (35 total)", art_count(pg))
    check(None not in caps and len(set(caps)) == 35, "all 35 articles are unique", len(set(caps)))
    check(any("offset=30" in r for r in feed_reqs()), "second request sends offset=30", feed_reqs())
    pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(300)
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(1200)
    check(len(feed_reqs()) == 2, "no more feed requests after hasMore is false", feed_reqs())
    cur = pg.get_by_role("navigation", name="Discover").locator("a[aria-current='page']")
    check(cur.count() == 1 and cur.inner_text().strip() == "Following", "tab row: Following is current (signed in)")
    check(real(errs) == [], "signed in: no console or page errors", errs)
    ctx.close()

    # ---- load more fails, then Retry; the loaded posts stay
    print("load more error")
    ctx, pg, errs, reqs = new_ctx(browser, cookies)
    pg.goto(WEB + "/discover/following")
    wait_posts(pg, 30)
    more = re.compile(r"/api/discover/feed.*offset=30")
    ctx.route(more, lambda r: r.fulfill(status=500, content_type="application/json", body='{"success":false}'))
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    pg.get_by_text("Couldn't load more. Try again.").wait_for(timeout=30000)
    check(art_count(pg) == 30, "load more error keeps the 30 loaded posts", art_count(pg))
    ctx.unroute(more)
    pg.get_by_role("button", name="Retry").click()
    wait_posts(pg, 35)
    check(art_count(pg) == 35 and pg.get_by_text("Couldn't load more. Try again.").count() == 0, "Retry loads the last 5")
    ctx.close()

    # ---- first page error, then Retry
    print("first page error")
    ctx, pg, errs, reqs = new_ctx(browser, cookies)
    ctx.route("**/api/discover/feed**", lambda r: r.fulfill(status=500, content_type="application/json", body='{"success":false}'))
    pg.goto(WEB + "/discover/following")
    pg.get_by_text("Couldn't load posts. Try again.").wait_for(timeout=60000)
    check(True, "first page error shows the error line")
    ctx.unroute("**/api/discover/feed**")
    pg.get_by_role("button", name="Retry").click()
    wait_posts(pg, 30)
    check(True, "Retry loads the posts")
    ctx.close()

    # ---- signed in, following nobody
    print("signed in, following nobody")
    cookies2, sid2 = auth_cookies(sql, BDIR, loner, WEB)
    sids.append(sid2)
    ctx, pg, errs, reqs = new_ctx(browser, cookies2)
    pg.goto(WEB + "/discover/following")
    pg.get_by_text("Follow people to see their posts here.").wait_for(timeout=60000)
    check(True, "following nobody: empty copy shows")
    find = pg.get_by_role("link", name="Find people on Pro")
    check(find.count() == 1 and find.get_attribute("href") == "/discover", "empty state links to /discover")
    check(pg.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), "1280px: no horizontal scroll")
    ctx.close()

    print("390px")
    ctx, pg, errs, reqs = new_ctx(browser, cookies, width=390)
    pg.goto(WEB + "/discover/following")
    wait_posts(pg, 30)
    check(pg.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), "390px: no horizontal scroll")
    ctx.close()


def cleanup():
    ids = ",".join(f"'{u}'" for u in created_users)
    if not ids:
        return
    posts = f"SELECT id FROM feed_posts WHERE author_id IN ({ids})"
    evs = f"SELECT id FROM events WHERE host_user_id IN ({ids})"
    stmts = [
        f"DELETE FROM post_likes WHERE post_id IN ({posts}) OR user_id IN ({ids})",
        f"DELETE FROM post_comments WHERE post_id IN ({posts}) OR user_id IN ({ids})",
        f"DELETE FROM user_saved_posts WHERE post_id IN ({posts})",
        f"DELETE FROM feed_engagement_events WHERE post_id IN ({posts})",
        f"DELETE FROM pulse_engagements WHERE post_id IN ({posts})",
        f"DELETE FROM feed_posts WHERE author_id IN ({ids})",
        f"DELETE FROM story_views WHERE viewer_id IN ({ids}) OR story_id IN (SELECT id FROM stories WHERE author_id IN ({ids}))",
        f"DELETE FROM stories WHERE author_id IN ({ids})",
        f"DELETE FROM follows WHERE follower_user_id IN ({ids}) OR target_user_id IN ({ids})",
        f"DELETE FROM notifications WHERE user_id IN ({ids})",
        f"DELETE FROM ticket_types WHERE event_id IN ({evs})",
        f"DELETE FROM events WHERE host_user_id IN ({ids})",
        f"DELETE FROM host_agreement_acceptances WHERE user_id IN ({ids})",
    ]
    stmts += [f"DELETE FROM sessions WHERE sid='{s}'" for s in sids]
    stmts.append(f"DELETE FROM users WHERE id IN ({ids})")
    for stmt in stmts:
        try:
            sql(stmt)
        except Exception as e:
            print("  cleanup failed:", stmt[:60], str(e)[:200])


try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        section_pro(browser)
        section_following(browser)
        browser.close()
except Exception as e:
    failed += 1
    print("  FAIL unexpected error:", str(e)[:600])
finally:
    cleanup()

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
