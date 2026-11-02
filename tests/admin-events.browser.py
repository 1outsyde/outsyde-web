"""
Browser checks for /admin/events and /admin/events/[id] (Playwright for Python, Chromium). LOCAL ONLY.
Run: python3 tests/admin-events.browser.py
Env (defaults shown): AEB_WEB_URL=http://localhost:3101  AEB_BACKEND_URL=http://localhost:5071
  AEB_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde_test  AEB_BACKEND_DIR=/home/claude/outsyde-backend
  AEB_RESEND_PORT=5098  AEB_SHOTS=<dir for screenshots> (optional)
Skips (exit 0) when the web or backend server is not up. Needs psql and node on PATH.

Seeds straight into SQL (same shapes as the backend's adminEvents*.http.test.ts): the admin info@goutsyde.com
with is_admin (refuses to run if that email already exists), a business hosted event with a payout in review, a
user hosted event with a held payout, an upcoming event, a paid event with a recovery owed 35 days, and an
ended event with no payout yet. Everything it created is removed in finally.

Email the host runs only when the backend on AEB_BACKEND_URL was started with RESEND_BASE_URL pointing at
http://127.0.0.1:<AEB_RESEND_PORT> (read from the backend process environment). This script then runs that
Resend stub itself (POST /emails answers with an id). Otherwise that case is reported as skipped.
"""
import re, json, os, subprocess, sys, time, threading, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

WEB = os.environ.get("AEB_WEB_URL", "http://localhost:3101")
BACKEND = os.environ.get("AEB_BACKEND_URL", "http://localhost:5071")
PG = os.environ.get("AEB_PG_URL", "postgresql://outsyde:outsyde@localhost:5432/outsyde_test")
BDIR = os.environ.get("AEB_BACKEND_DIR", "/home/claude/outsyde-backend")
RESEND_PORT = int(os.environ.get("AEB_RESEND_PORT", "5098"))
SHOTS = os.environ.get("AEB_SHOTS")
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
try:
    from playwright.sync_api import sync_playwright
except Exception:
    print("skipped: playwright for python not installed"); sys.exit(0)

passed = failed = skipped = 0
def check(cond, name, detail=""):
    global passed, failed
    if cond: passed += 1; print("  ok  " + name)
    else: failed += 1; print("  FAIL " + name, str(detail)[:400])
def skip(name, why):
    global skipped
    skipped += 1; print(f"  skip {name}: {why}")

def sql(q):
    r = subprocess.run(["psql", PG, "-At", "-v", "ON_ERROR_STOP=1", "-c", q], capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr)
    return r.stdout.strip()
def one(q):
    return sql(q).splitlines()[0]

def tok(uid, is_admin):
    code = f'console.log(require("jsonwebtoken").sign({{userId:"{uid}",isVendor:false,isAdmin:{"true" if is_admin else "false"}}},"test",{{expiresIn:"1h"}}))'
    return subprocess.run(["node", "-e", code], capture_output=True, text=True, cwd=BDIR, check=True).stdout.strip()

def cents(text):
    m = re.search(r"(-?)\$([\d,]+)\.(\d{2})", text or "")
    if not m: return None
    v = int(m.group(2).replace(",", "")) * 100 + int(m.group(3))
    return -v if m.group(1) else v

def backend_resend_base():
    """RESEND_BASE_URL of the local backend process serving AEB_BACKEND_URL's port, or None."""
    port = str(urlparse(BACKEND).port or 80)
    for pid in os.listdir("/proc"):
        if not pid.isdigit(): continue
        try:
            cmd = open(f"/proc/{pid}/cmdline", "rb").read().replace(b"\0", b" ").decode(errors="ignore")
            if "server/index.ts" not in cmd: continue
            env = dict(kv.split("=", 1) for kv in open(f"/proc/{pid}/environ", "rb").read().decode(errors="ignore").split("\0") if "=" in kv)
        except Exception:
            continue
        if env.get("PORT") == port and "RESEND_BASE_URL" in env:
            return env["RESEND_BASE_URL"]
    return None

# Resend stub: records POST /emails bodies and answers with an id.
stub_sent = []
class Stub(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        try: body = json.loads(self.rfile.read(n) or b"{}")
        except Exception: body = {}
        stub_sent.append({"path": self.path, **(body if isinstance(body, dict) else {})})
        out = json.dumps({"id": f"stub_{len(stub_sent)}"}).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(out))); self.end_headers()
        self.wfile.write(out)
    def log_message(self, *a): pass

P = "aeb" + format(int(time.time()), "x")
def H(d, h=0): return f"now() + interval '{d} days' + interval '{h} hours'"

def real(errs):
    return [e for e in errs if not e.startswith("Failed to load resource") and "/_vercel/insights/" not in e]

def new_ctx(browser, token, width):
    ctx = browser.new_context(viewport={"width": width, "height": 900})
    if token:
        ctx.add_cookies([{"name": "outsyde_access_token", "value": token, "url": WEB}])
    ctx.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    return ctx, pg, errs

if sql(f"SELECT count(*) FROM users WHERE lower(email)='{ADMIN_EMAIL}'") != "0":
    sys.exit(f"refusing to run: {ADMIN_EMAIL} already exists in this database")

resend_base = backend_resend_base()
stub = None
if resend_base and urlparse(resend_base).hostname in ("127.0.0.1", "localhost") and urlparse(resend_base).port == RESEND_PORT:
    stub = HTTPServer(("127.0.0.1", RESEND_PORT), Stub)
    threading.Thread(target=stub.serve_forever, daemon=True).start()

event_ids = []
admin = None
started = one("SELECT now()")
def mk_user(s, email=None, admin_flag=False):
    return one(f"INSERT INTO users (id,email,name,first_name,username,is_admin) VALUES (gen_random_uuid(),'{email or P + '-' + s + '@test.local'}','Shown {s}','Realfirst{s}','{(P + s)[:24]}',{str(admin_flag).lower()}) RETURNING id")

def mk_event(host, title, start_d, kind="user", biz=None, status="published"):
    eid = one(f"""INSERT INTO events (host_user_id, host_type, host_business_id, slug, title, status, starts_at, ends_at, timezone, city, state, capacity,
        published_at, created_at) VALUES ('{host}', '{kind}', {f"'{biz}'" if biz else 'NULL'}, '{P}-{len(event_ids)}', '{P} {title}', '{status}',
        {H(start_d)}, {H(start_d, 3)}, 'America/New_York', 'Freeport', 'NY', 100, {H(start_d - 20)}, {H(start_d - 30)}) RETURNING id""")
    event_ids.append(eid)
    return eid

def mk_type(eid, name, price):
    return one(f"INSERT INTO ticket_types (event_id, name, price_cents, quantity, sort_order) VALUES ('{eid}', '{name}', {price}, 100, 0) RETURNING id")

def mk_order(eid, tid, buyer, price, count, payout=None, refunded=False):
    svc, per, plat = 111 * count, 99 * count, 77 * count
    sub = price * count
    status = "refunded" if refunded else "completed"
    oid = one(f"""INSERT INTO ticket_orders (event_id, buyer_user_id, status, ticket_count, subtotal_cents, service_fee_cents, per_ticket_fee_cents, platform_fee_cents,
        host_net_cents, total_cents, refunded_cents, refund_reason, refund_amount_cents, refund_requested_at, refunded_at, completed_at, paid_at)
        VALUES ('{eid}', '{buyer}', '{status}', {count}, {sub}, {svc}, {per}, {plat}, {sub - plat}, {sub + svc + per}, {sub if refunded else 0},
        {"'host'" if refunded else 'NULL'}, 0, {"now() - interval '1 day'" if refunded else 'NULL'}, {"now() - interval '1 day'" if refunded else 'NULL'},
        now() - interval '3 days', now() - interval '3 days') RETURNING id""")
    iid = one(f"""INSERT INTO ticket_order_items (order_id, event_id, ticket_type_id, buyer_user_id, quantity, unit_price_cents, status, expires_at)
        VALUES ('{oid}', '{eid}', '{tid}', '{buyer}', {count}, {price}, 'issued', now() + interval '1 day') RETURNING id""")
    ids = []
    for i in range(1, count + 1):
        ids.append(one(f"""INSERT INTO tickets (order_id, order_item_id, event_id, ticket_type_id, holder_user_id, item_index, code, status, price_cents,
            service_fee_cents, per_ticket_fee_cents, platform_fee_cents, host_net_cents, refunded_at, payout_id)
            VALUES ('{oid}', '{iid}', '{eid}', '{tid}', '{buyer}', {i}, '{P}{eid[:6]}{i}{int(time.time()*1000) % 100000}', '{"refunded" if refunded else "valid"}', {price},
            111, 99, 77, {price - 77}, {"now() - interval '1 day'" if refunded else 'NULL'}, {f"'{payout}'" if payout else 'NULL'}) RETURNING id"""))
    return ids

def mk_payout(eid, status, dest, acct, gross, hold=None, attempts=0, last_error=None, paid_d=None):
    return one(f"""INSERT INTO event_payouts (event_id, destination_type, connected_account_id, gross_cents, deducted_cents, amount_cents, status, hold_reason, attempts,
        last_error, paid_at, transfer_id, next_attempt_at, alerted_at, created_at, updated_at)
        VALUES ('{eid}', '{dest}', {f"'{acct}'" if acct else 'NULL'}, {gross}, 0, {gross}, '{status}', {f"'{hold}'" if hold else 'NULL'}, {attempts},
        {f"'{last_error}'" if last_error else 'NULL'}, {H(paid_d) if paid_d is not None else 'NULL'}, {f"'tr_{P}'" if status == 'paid' else 'NULL'},
        now() + interval '1 day', now(), now() - interval '2 days', now() - interval '1 day') RETURNING id""")

try:
    admin = mk_user("adm", ADMIN_EMAIL, True)
    plain = mk_user("plain")
    host_b, host_u, host_o, buyer = mk_user("hostb"), mk_user("hostu"), mk_user("hosto"), mk_user("buy")
    biz = one(f"""INSERT INTO businesses (owner_id, name, category, approval_status, stripe_account_id, stripe_onboarding_complete)
        VALUES ('{host_b}', '{P} Lounge', 'Events', 'approved', 'acct_1TESTbiz4f2a', true) RETURNING id""")
    sql(f"INSERT INTO user_payout_accounts (user_id, stripe_account_id, onboarding_complete) VALUES ('{host_o}', 'acct_1TESTold9z9z', true)")

    # 1. Business host, ended 5 days ago, payout in review.
    ev_biz = mk_event(host_b, "Biz night", -5, "business", biz)
    t = mk_type(ev_biz, "Early", 3000)
    pay_biz = mk_payout(ev_biz, "review", "business", "acct_1TESTbiz4f2a", 2 * 2923, attempts=5,
                        last_error="Stripe refused the transfer: acct_1TESTbiz4f2a can not receive transfers")
    mk_order(ev_biz, t, buyer, 3000, 2, payout=pay_biz)
    # 2. User host with no payout account, ended 5 days ago, payout held.
    ev_user = mk_event(host_u, "User party", -5)
    t = mk_type(ev_user, "General", 2000)
    pay_user = mk_payout(ev_user, "held", "user", None, 3 * 1923, hold="no_account")
    mk_order(ev_user, t, buyer, 2000, 3, payout=pay_user)
    # 3. Upcoming business event, no payout row.
    ev_up = mk_event(host_b, "Upcoming gala", 10, "business", biz)
    t = mk_type(ev_up, "General", 1500)
    mk_order(ev_up, t, buyer, 1500, 2)
    # 4. Paid event, ended 40 days ago, one ticket refunded after payout and owed for 35 days.
    ev_old = mk_event(host_o, "Old fest", -40)
    t = mk_type(ev_old, "General", 3000)
    pay_old = mk_payout(ev_old, "paid", "user", "acct_1TESTold9z9z", 3 * 2923, paid_d=-36)
    mk_order(ev_old, t, buyer, 3000, 2, payout=pay_old)
    [ref_t] = mk_order(ev_old, t, buyer, 3000, 1, payout=pay_old, refunded=True)
    rec_old = one(f"""INSERT INTO event_payout_recoveries (ticket_id, payout_id, connected_account_id, amount_cents, status, last_error, alerted_at, created_at, updated_at)
        VALUES ('{ref_t}', '{pay_old}', 'acct_1TESTold9z9z', 2923, 'owed', 'Insufficient funds on acct_1TESTold9z9z', now(), now() - interval '35 days', now() - interval '34 days') RETURNING id""")
    # 5. Ended yesterday, nothing paid out yet (the "Ended, payout not sent yet" bucket).
    ev_due = mk_event(host_o, "Late show", -1)
    t = mk_type(ev_due, "General", 2500)
    mk_order(ev_due, t, buyer, 2500, 1)

    # 6. Held because the event is paused, 7. in review for a Stripe duplicate, 8. cancelled with a payout in review:
    # Email the host would always be refused for these, so it is hidden.
    ev_pause = mk_event(host_u, "Paused night", -5)
    t = mk_type(ev_pause, "General", 2000)
    pay_pause = mk_payout(ev_pause, "held", "user", None, 1923, hold="event_paused")
    mk_order(ev_pause, t, buyer, 2000, 1, payout=pay_pause)
    ev_dup = mk_event(host_b, "Dup night", -5, "business", biz)
    t = mk_type(ev_dup, "General", 2000)
    pay_dup = mk_payout(ev_dup, "review", "business", "acct_1TESTbiz4f2a", 1923, attempts=1,
                        last_error="Stripe already has transfer tr_dup for this payout with a different amount")
    mk_order(ev_dup, t, buyer, 2000, 1, payout=pay_dup)
    ev_can = mk_event(host_b, "Called off", -5, "business", biz, status="cancelled")
    t = mk_type(ev_can, "General", 2000)
    pay_can = mk_payout(ev_can, "review", "business", "acct_1TESTbiz4f2a", 1923, attempts=1,
                        last_error="the event was cancelled after its payout was created")
    mk_order(ev_can, t, buyer, 2000, 1, payout=pay_can)

    admin_tok = tok(admin, True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        print("list (1280px)")
        ctx, pg, errs = new_ctx(browser, admin_tok, 1280)
        with pg.expect_response(lambda r: urlparse(r.url).path == "/api/admin/events" and r.request.method == "GET", timeout=90000) as info:
            pg.goto(WEB + "/admin/events", timeout=90000)
        list_res = info.value
        body = list_res.json()
        check(list_res.status == 200 and "from=" in list_res.url, "list fetched through the BFF with a from date (Last 90 days)", list_res.url)
        pg.locator("[data-tile='Ticket sales']").wait_for(timeout=30000)
        check(pg.title() == "Events | Outsyde Admin", "tab title", pg.title())
        events = body["events"]
        ids = {e["id"] for e in events}
        check(all(x in ids for x in (ev_biz, ev_user, ev_up, ev_old, ev_due, ev_pause, ev_dup, ev_can)), "every seeded event is listed")
        check(pg.get_by_role("combobox", name="Date range").input_value() == "last90", "date range defaults to Last 90 days")

        # By date is the default; bucket headers in order.
        check(pg.get_by_role("button", name="By date").get_attribute("aria-pressed") == "true", "By date is the default view")
        heads = [h.strip() for h in pg.locator("[data-group='bucket'] .aem-group-name").all_inner_texts()]
        order = ["Needs you now", "Ended, payout not sent yet", "Coming up", "Paid", "Ended, nothing to pay", "Cancelled"]
        check(all(h in order for h in heads) and heads == sorted(heads, key=order.index), "bucket headers are in the fixed order", heads)
        check(heads[:4] == order[:4], "seeded events fill the first four buckets in order", heads)
        def bucket_of(eid):
            return pg.locator(f"[data-group='bucket']:has(a[data-event-id='{eid}']) .aem-group-name").inner_text().strip()
        check(bucket_of(ev_biz) == "Needs you now" and bucket_of(ev_user) == "Needs you now", "review and held payouts are under Needs you now")
        check(bucket_of(ev_due) == "Ended, payout not sent yet", "ended unpaid event is under Ended, payout not sent yet")
        check(bucket_of(ev_up) == "Coming up" and bucket_of(ev_old) == "Paid", "upcoming and paid events are in their buckets")
        check(bucket_of(ev_can) == "Cancelled", "cancelled event is under Cancelled")
        bucket_sum = sum(cents(x) or 0 for x in pg.locator("[data-group='bucket'] .aem-group-sums b").all_inner_texts())
        check(bucket_sum == sum(e["hostEarnsCents"] for e in events), "bucket Host earns sums add up to the rows", bucket_sum)

        # Tiles equal the sums of the listed rows.
        def tile(label): return cents(pg.locator(f"[data-tile='{label}'] .aem-tile-value").inner_text())
        live = [e for e in events if e["status"] != "cancelled"]
        check(tile("Ticket sales") == sum(e["salesCents"] for e in events), "Ticket sales tile equals the sum", tile("Ticket sales"))
        check(tile("Outsyde fees") == sum(e["outsydeFeesCents"] for e in events), "Outsyde fees tile equals the sum", tile("Outsyde fees"))
        check(tile("Owed to hosts") == sum(e["owedToHostCents"] for e in live), "Owed to hosts tile equals the sum", tile("Owed to hosts"))
        check(tile("Paid to hosts") == sum(e["paidToHostCents"] for e in events), "Paid to hosts tile equals the sum", tile("Paid to hosts"))
        check(tile("Refunded") == sum(e["refundedCents"] for e in events), "Refunded tile equals the sum", tile("Refunded"))
        att_tile = pg.locator("[data-tile='Needs attention'] .aem-tile-value").inner_text().strip()
        check(att_tile == str(len(body["attention"])), "Needs attention tile counts the attention items", att_tile)
        hints = pg.locator(".aem-tile-hint").all_inner_texts()
        check("All tickets sold, including any later refunded" in hints and "Ticket price only" in hints, "tile footnotes", hints)
        page_text = pg.locator(".aem-page").inner_text()
        check("%" not in page_text, "no percentages on the page")
        check(not re.search(r"\s[-–—]\s", page_text), "no dash breaks in the copy")

        # Needs attention strip.
        card = lambda iid: pg.locator(f".aem-attn-card[data-item-id='{iid}']")
        check(card(pay_biz).count() == 1 and card(pay_user).count() == 1 and card(rec_old).count() == 1, "strip has the review, held and owed items")
        check(card(pay_biz).get_by_role("button", name="Try again").count() == 1 and card(pay_biz).get_by_role("button", name="Email the host").count() == 1
              and card(pay_biz).get_by_role("link", name="View event").count() == 1, "review card: Try again, Email the host, View event")
        check(card(pay_user).get_by_role("button", name="Email the host").count() == 1 and card(pay_user).get_by_role("link", name="View event").count() == 1,
              "held card: Email the host, View event")
        check(card(rec_old).get_by_role("button", name="Mark collected").count() == 1 and card(rec_old).get_by_role("button", name="Write off").count() == 1,
              "owed card: Mark collected, Write off")
        check(card(pay_pause).count() == 1 and card(pay_pause).get_by_role("button", name="Email the host").count() == 0, "held for a paused event: no Email the host")
        check(card(pay_dup).get_by_role("button", name="Try again").count() == 1 and card(pay_dup).get_by_role("button", name="Email the host").count() == 0,
              "review for a Stripe duplicate: Try again, no Email the host")
        check(card(pay_can).count() == 1 and card(pay_can).get_by_role("button", name="Email the host").count() == 0, "review on a cancelled event: no Email the host")
        check(card(pay_can).get_by_role("button", name="Try again").count() == 0, "review on a cancelled event: no Try again (the backend would refuse it)")

        # Filter chips: counts match the rows they show.
        exact = ids == {ev_biz, ev_user, ev_up, ev_old, ev_due, ev_pause, ev_dup, ev_can}
        want = {"all": 8, "upcoming": 1, "awaiting": 1, "paid": 1, "attention": 4}
        for fid in ("upcoming", "awaiting", "paid", "attention", "all"):
            chip = pg.locator(f"button.aem-chip[data-filter='{fid}']")
            n = int(chip.inner_text().rsplit("·", 1)[1].strip())
            chip.click()
            pg.wait_for_timeout(150)
            rows = pg.locator("a.aem-row").count()
            check(chip.get_attribute("aria-pressed") == "true" and n == rows, f"chip {fid}: count {n} equals the rows shown", rows)
            if exact: check(n == want[fid], f"chip {fid}: count is {want[fid]} for the seed", n)
            if fid == "attention":
                shown = set(pg.locator("a.aem-row").evaluate_all("els => els.map(e => e.dataset.eventId)"))
                check({ev_biz, ev_user} <= shown and not ({ev_up, ev_old, ev_due} & shown), "Needs attention shows only stuck and held payouts", shown)
                check(set(pg.locator("[data-group='bucket'] .aem-group-name").all_inner_texts()) == {"Needs you now"}, "Needs attention view is one bucket")
        check(int(pg.locator("button.aem-chip[data-filter='all']").inner_text().rsplit("·", 1)[1]) == len(events), "All chip counts every listed event")

        # Search narrows rows and counts.
        pg.get_by_role("searchbox", name="Search host or event").fill(f"{P} Upcoming")
        pg.wait_for_timeout(150)
        check(pg.locator("a.aem-row").count() == 1 and "· 1" in pg.locator("button.aem-chip[data-filter='all']").inner_text(), "search narrows rows and counts")
        pg.get_by_role("searchbox", name="Search host or event").fill("")

        # By host shows host group headers.
        pg.get_by_role("button", name="By host").click()
        pg.locator("[data-group='host']").first.wait_for(timeout=5000)
        hnames = [h.strip() for h in pg.locator("[data-group='host'] .aem-group-name").all_inner_texts()]
        check(pg.get_by_role("button", name="By host").get_attribute("aria-pressed") == "true", "By host switch turns on")
        check(f"{P} Lounge" in hnames and "Individual hosts" in hnames and hnames.index(f"{P} Lounge") < hnames.index("Individual hosts"), "host groups: business before individual hosts", hnames)
        biz_group = pg.locator(f"[data-group='host']:has(.aem-group-name:text-is('{P} Lounge'))")
        check(biz_group.locator("a.aem-row").count() == 4 and "Business" in biz_group.locator(".aem-kind").inner_text(), "business group holds its four events")
        check(re.search(r"needs? payout setup", pg.locator("[data-group='host']:has(.aem-group-name:text-is('Individual hosts')) .aem-bad-text").inner_text()) is not None, "individual hosts flag the host without payout setup")
        pg.get_by_role("button", name="By date").click()

        # Range change refetches with a new from.
        with pg.expect_response(lambda r: urlparse(r.url).path == "/api/admin/events", timeout=30000) as info2:
            pg.get_by_role("combobox", name="Date range").select_option("all")
        check("from=" not in info2.value.url, "All time refetches without a from date", info2.value.url)
        pg.wait_for_timeout(300)
        if SHOTS: pg.screenshot(path=f"{SHOTS}/admin-events-1280.png", full_page=True)
        check(real(errs) == [], "no console or page errors on the list", errs)

        # Email the host on the held payout (needs the Resend stub).
        if stub:
            c = card(pay_user)
            c.get_by_role("button", name="Email the host").click()
            check(c.get_by_role("button", name="Confirm: Email the host?").count() == 1, "Email the host asks to confirm")
            c.get_by_role("button", name="Confirm: Email the host?").click()
            pg.locator(".aem-banner-ok").wait_for(timeout=20000)
            check(pg.locator(".aem-banner-ok").inner_text().startswith("Email sent to the host."), "green banner: Email sent to the host.")
            mine = [m for m in stub_sent if P in str(m.get("to")) and "User party" in str(m.get("subject"))]
            check(len(mine) == 1 and f"{P}-hostu@test.local" in str(mine[0].get("to")), "one email went to the held payout's host through the stub", mine)
            check(sql(f"SELECT status FROM event_payouts WHERE id='{pay_user}'") == "held", "email leaves the payout held")
            c.get_by_role("button", name="Email the host").click()
            c.get_by_role("button", name="Confirm: Email the host?").click()
            pg.locator(".aem-banner-error").wait_for(timeout=20000)
            check(pg.locator(".aem-banner-error").inner_text().startswith("The host was emailed in the last 24 hours."), "a second email the same day shows the 24 hour message")
        else:
            skip("Email the host", f"backend not started with RESEND_BASE_URL=http://127.0.0.1:{RESEND_PORT} (found {resend_base!r}); see task-B3-report.md")

        # A second tab on the event page, opened while the payout is still in review (used for the 409 case below).
        pg2 = ctx.new_page()
        pg2.on("pageerror", lambda e: errs.append(str(e)))
        pg2.goto(WEB + f"/admin/events/{ev_biz}")
        pg2.locator("[data-testid='aem-payout-card']").get_by_role("button", name="Try again").wait_for(timeout=60000)

        # Try again on the review payout: confirm, cancel, confirm.
        c = card(pay_biz)
        c.get_by_role("button", name="Try again").click()
        check(c.get_by_role("button", name="Confirm: Try again?").count() == 1 and c.get_by_role("button", name="Cancel").count() == 1, "Try again turns into Confirm: Try again? with Cancel")
        check(c.get_by_role("button", name="Email the host").count() == 0, "other buttons step aside while confirming")
        c.get_by_role("button", name="Cancel").click()
        check(c.get_by_role("button", name="Try again").count() == 1 and c.get_by_role("button", name="Confirm: Try again?").count() == 0, "Cancel restores Try again")
        check(sql(f"SELECT status FROM event_payouts WHERE id='{pay_biz}'") == "review", "Cancel changes nothing")
        c.get_by_role("button", name="Try again").click()
        c.get_by_role("button", name="Confirm: Try again?").click()
        pg.locator(".aem-banner-ok").wait_for(timeout=20000)
        check(pg.locator(".aem-banner-ok").inner_text().startswith("Payout set to try again. The payout job tries it again within a few minutes."), "green banner after Try again")
        st = sql(f"SELECT status || ':' || attempts FROM event_payouts WHERE id='{pay_biz}'")
        aud = sql(f"SELECT count(*) FROM audit_logs WHERE target_id='{pay_biz}' AND action='event_payout.retry' AND after_state->>'status'='pending'")
        if st.startswith("pending"):
            check(True, "DB payout is status pending")
        else:  # the backend's minute job may already have picked it up
            check(aud == "1", "DB payout went to pending (the payout job has since taken it)", st)
        pg.wait_for_function(f"!document.querySelector(\".aem-attn-card[data-item-id='{pay_biz}']\")", timeout=10000)
        check(card(pay_biz).count() == 0, "the payout is gone from Needs attention")

        # The stale tab tries again: the backend's nested 409 NOT_IN_REVIEW becomes the friendly red banner.
        before = sql(f"SELECT status || ':' || updated_at FROM event_payouts WHERE id='{pay_biz}'")
        pc2 = pg2.locator("[data-testid='aem-payout-card']")
        with pg2.expect_response(lambda r: r.url.endswith(f"/payouts/{pay_biz}/retry"), timeout=30000) as rinfo:
            pc2.get_by_role("button", name="Try again").click()
            pc2.get_by_role("button", name="Confirm: Try again?").click()
        rb = rinfo.value.json()
        # The backend sends {success:false, error:{code, message}}; the shared BFF reader (lib/read-json-safe.ts) relays it as
        # {error: message, code}. The page reads either shape.
        rcode = rb["error"].get("code") if isinstance(rb.get("error"), dict) else rb.get("code")
        check(rinfo.value.status == 409 and rcode == "NOT_IN_REVIEW", "retry on a payout no longer in review: 409 NOT_IN_REVIEW", rb)
        pg2.locator(".aem-banner-error").wait_for(timeout=20000)
        check(pg2.locator(".aem-banner-error").inner_text().startswith("This payout is no longer in review."), "red banner with the friendly NOT_IN_REVIEW copy", pg2.locator(".aem-banner-error").inner_text())
        check(pc2.get_by_role("button", name="Try again").count() == 0, "the event page refetched and no longer offers Try again")
        check(sql(f"SELECT status || ':' || updated_at FROM event_payouts WHERE id='{pay_biz}'") == before, "the refused retry changed nothing")
        pg2.close()

        # Mark collected on the owed recovery.
        c = card(rec_old)
        c.get_by_role("button", name="Mark collected").click()
        check(c.get_by_role("button", name="Confirm: Mark collected?").count() == 1 and c.get_by_role("button", name="Write off").count() == 0, "Mark collected asks to confirm")
        c.get_by_role("button", name="Cancel").click()
        check(c.get_by_role("button", name="Mark collected").count() == 1, "Cancel restores Mark collected")
        c.get_by_role("button", name="Mark collected").click()
        c.get_by_role("button", name="Confirm: Mark collected?").click()
        pg.locator(".aem-banner-ok").wait_for(timeout=20000)
        check(pg.locator(".aem-banner-ok").inner_text().startswith("Marked collected."), "green banner: Marked collected.")
        check(sql(f"SELECT status FROM event_payout_recoveries WHERE id='{rec_old}'") == "collected", "DB recovery is status collected")
        pg.wait_for_function(f"!document.querySelector(\".aem-attn-card[data-item-id='{rec_old}']\")", timeout=10000)
        check(card(rec_old).count() == 0, "the recovery is gone from Needs attention")
        check(real(errs) == [], "no console or page errors after the actions", errs)

        # Row opens the detail page.
        pg.locator(f"a.aem-row[data-event-id='{ev_biz}']").click()
        pg.wait_for_url(f"**/admin/events/{ev_biz}", timeout=60000)
        pg.locator("[data-testid='aem-payout-card']").wait_for(timeout=60000)
        check(pg.title() == "Event money | Outsyde Admin", "detail tab title", pg.title())
        tt = pg.locator("[data-testid='aem-ticket-types']").inner_text()
        check("Early" in tt and "Total" in tt and "$60.00" in tt, "detail shows ticket types with a total row", tt)
        pc = pg.locator("[data-testid='aem-payout-card']").inner_text()
        check("$58.46" in pc and "acct_••••4f2a" in pc and "acct_1TEST" not in pg.content(), "payout card shows the amount and a masked account", pc)
        # p4-team 4b-1: the team pay taken from the payout, so earned, taken back, team and payout add up.
        team_line = pg.locator("[data-testid='aem-payout-team']")
        check(team_line.count() == 1 and "Paid to the event team" in team_line.inner_text() and "$0.00" in team_line.inner_text(),
              "payout card shows the team pay line", team_line.inner_text() if team_line.count() else None)
        check("Payout set to try again by @" in pg.locator("[data-testid='aem-activity']").inner_text(), "activity lists the retry")
        head_pill = pg.locator("[data-testid='aem-payout-pill']").inner_text().strip()
        card_pill = pg.locator("[data-testid='aem-payout-card-pill']").inner_text().strip()
        check(card_pill == head_pill and head_pill.startswith("Due"), "overdue pending payout: card pill matches the header pill", [head_pill, card_pill])
        check(pg.get_by_role("link", name="All events").get_attribute("href") == "/admin/events", "back link to all events")

        # Held payout detail: Email the host only. Owed recovery detail: collected row has no actions.
        pg.goto(WEB + f"/admin/events/{ev_user}")
        pg.locator("[data-testid='aem-payout-card']").wait_for(timeout=60000)
        pcl = pg.locator("[data-testid='aem-payout-card']")
        check(pcl.get_by_role("button", name="Email the host").count() == 1 and pcl.get_by_role("button", name="Try again").count() == 0, "held payout card: Email the host only")
        pg.goto(WEB + f"/admin/events/{ev_can}")
        pg.locator("[data-testid='aem-payout-card']").wait_for(timeout=60000)
        pcl = pg.locator("[data-testid='aem-payout-card']")
        check(pcl.get_by_role("button", name="Try again").count() == 0 and pcl.get_by_role("button", name="Email the host").count() == 0, "cancelled event payout card: no Try again, no Email the host")
        check(pg.locator("[data-testid='aem-payout-card-pill']").inner_text().strip() == "Won't be paid, event cancelled", "cancelled event payout card pill: Won't be paid, event cancelled")
        pg.goto(WEB + f"/admin/events/{ev_old}")
        pg.locator("[data-testid='aem-recoveries']").wait_for(timeout=60000)
        rec = pg.locator(f"[data-recovery-id='{rec_old}']")
        check("Marked collected" in rec.inner_text() and rec.get_by_role("button").count() == 0, "collected recovery shows its status with no actions", rec.inner_text())
        check(real(errs) == [], "no console or page errors on the detail pages", errs)
        ctx.close()

        print("admin header widths")
        title_one_line = "(() => { const t = document.querySelector('.admin-title'); return t.getBoundingClientRect().height < parseFloat(getComputedStyle(t).fontSize) * 1.8; })()"
        for width in (768, 820, 1024, 1280):
            wctx, wpg, _ = new_ctx(browser, admin_tok, width)
            for path in ("/admin/events", "/admin", "/admin/refunds"):
                wpg.goto(WEB + path)
                wpg.locator(".admin-title").wait_for(timeout=60000)
                wpg.wait_for_load_state("networkidle")
                wpg.wait_for_timeout(300)
                dims = wpg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
                check(dims[0] <= dims[1], f"{width}px {path}: no horizontal page scroll", dims)
                check(wpg.evaluate(title_one_line), f"{width}px {path}: OUTSYDE ADMIN stays on one line")
            wpg.goto(WEB + "/admin/events")
            wpg.locator(".admin-title").wait_for(timeout=60000)
            if width < 1024:
                wpg.get_by_role("button", name="Menu").click()
                panel = wpg.locator("#admin-nav-panel")
                check(panel.is_visible() and panel.get_by_role("link", name="Events").count() == 1 and not wpg.locator(".admin-nav-desktop").is_visible(),
                      f"{width}px: Menu opens the admin links and the desktop row is hidden")
            else:
                check(wpg.locator(".admin-nav-desktop").is_visible() and not wpg.get_by_role("button", name="Menu").is_visible(),
                      f"{width}px: desktop link row shows, no Menu button")
            wctx.close()

        print("not an admin")
        ctx, pg, errs = new_ctx(browser, tok(plain, False), 1280)
        pg.goto(WEB + "/admin/events")
        pg.get_by_text("Not authorized").wait_for(timeout=60000)
        check(pg.locator(".aem-tile").count() == 0, "non admin sees Not authorized and no data")
        pg.goto(WEB + f"/admin/events/{ev_biz}")
        pg.get_by_text("Not authorized").wait_for(timeout=60000)
        check(pg.locator("[data-testid='aem-payout-card']").count() == 0, "non admin detail shows Not authorized")
        ctx.close()

        print("phone (390px)")
        ctx, pg, errs = new_ctx(browser, admin_tok, 390)
        pg.goto(WEB + "/admin/events")
        pg.locator("[data-tile='Ticket sales']").wait_for(timeout=60000)
        pg.wait_for_timeout(300)
        check(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "390px list: no horizontal page scroll",
              pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]"))
        check(pg.locator("[data-testid='aem-table-scroll']").evaluate("el => el.scrollWidth > el.clientWidth"), "390px: the table scrolls inside its own box")
        if SHOTS: pg.screenshot(path=f"{SHOTS}/admin-events-390.png", full_page=True)
        pg.goto(WEB + f"/admin/events/{ev_biz}")
        pg.locator("[data-testid='aem-payout-card']").wait_for(timeout=60000)
        pg.wait_for_timeout(300)
        check(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "390px detail: no horizontal page scroll",
              pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]"))
        if SHOTS: pg.screenshot(path=f"{SHOTS}/admin-event-390.png", full_page=True)
        check(real(errs) == [], "no console or page errors at 390px", errs)
        ctx.close()
        browser.close()
finally:
    ev = ",".join(f"'{e}'" for e in event_ids) or "NULL"
    pays = f"SELECT id FROM event_payouts WHERE event_id IN ({ev})"
    recs = f"SELECT id FROM event_payout_recoveries WHERE payout_id IN ({pays})"
    for stmt in (
        f"DELETE FROM audit_logs WHERE target_id IN ({pays}) OR target_id IN ({recs})",
        f"DELETE FROM event_payout_recoveries WHERE payout_id IN ({pays})",
        f"DELETE FROM tickets WHERE event_id IN ({ev})",
        f"DELETE FROM ticket_order_items WHERE event_id IN ({ev})",
        f"DELETE FROM ticket_orders WHERE event_id IN ({ev})",
        f"DELETE FROM event_payouts WHERE event_id IN ({ev})",
        f"DELETE FROM ticket_types WHERE event_id IN ({ev})",
        f"DELETE FROM events WHERE id IN ({ev})",
        f"DELETE FROM businesses WHERE owner_id IN (SELECT id FROM users WHERE email LIKE '{P}-%')",
        f"DELETE FROM user_payout_accounts WHERE user_id IN (SELECT id FROM users WHERE email LIKE '{P}-%')",
        f"DELETE FROM email_log WHERE user_id IS NULL AND label = 'Event payout notice' AND created_at >= '{started}'",
        f"DELETE FROM audit_logs WHERE actor_id = '{admin}'" if admin else "SELECT 1",
        f"DELETE FROM users WHERE id = '{admin}' AND email = '{ADMIN_EMAIL}'" if admin else "SELECT 1",
        f"DELETE FROM users WHERE email LIKE '{P}-%'",
    ):
        try:
            sql(stmt)
        except Exception as e:
            print("  cleanup failed:", str(e)[:200])
    if stub: stub.shutdown()
    print(f"  cleanup: {ADMIN_EMAIL} rows left = {sql(f'SELECT count(*) FROM users WHERE lower(email)=' + chr(39) + ADMIN_EMAIL + chr(39))}")

print(f"\n{passed} passed, {failed} failed, {skipped} skipped")
sys.exit(1 if failed else 0)
