"""LOCAL ONLY. The "Get the app" card on /e/[slug], against a stub backend (no database needed).

Run: start a stub with `python3 tests/event-app-card.browser.py --stub 5099`, then start the site with
OUTSYDE_BACKEND_URL=http://127.0.0.1:5099 npx next dev -p 3109, then `WEB=http://localhost:3109 python3 tests/event-app-card.browser.py`.
"""
import json, os, sys
from datetime import datetime, timedelta, timezone

SLUG = "app-card-test"


def event_payload():
    start = datetime.now(timezone.utc) + timedelta(days=3)
    iso = lambda d: d.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    return {
        "success": True,
        "event": {
            "id": "ev-app-card", "slug": SLUG, "status": "published", "title": "App Card Party", "description": "A test event.",
            "coverImageUrl": None, "startsAt": iso(start), "endsAt": iso(start + timedelta(hours=4)), "timezone": "America/New_York",
            "venueName": None, "addressLine1": None, "addressLine2": None, "city": "Freeport", "state": "NY", "postalCode": None,
            "latitude": None, "longitude": None, "addressHidden": True, "addressRevealAt": None,
            "refundPolicy": "no_refunds", "refundCutoffHours": None, "visibility": "public", "soldOut": False,
            "host": {"name": "Test Host", "avatarUrl": None, "kind": "user", "followId": "u1"},
            "viewerIsHost": False, "viewerHasTicket": False,
        },
        "ticketTypes": [{
            "id": "tt1", "name": "Free RSVP", "description": None, "priceCents": 0, "serviceFeeCents": None, "buyerTotalCents": None,
            "salesStatus": "on_sale", "remaining": 50, "salesStartAt": None, "salesEndAt": None,
            "minPerOrder": 1, "maxPerOrder": 4, "perAccountLimit": None,
        }],
    }


def run_stub(port):
    from http.server import BaseHTTPRequestHandler, HTTPServer

    class H(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path.startswith(f"/api/events/slug/{SLUG}"):
                body, code = json.dumps(event_payload()).encode(), 200
            elif self.path.startswith("/api/events/slug/"):
                body, code = json.dumps({"success": False, "error": {"code": "EVENT_NOT_FOUND", "message": "Event not found."}}).encode(), 404
            else:
                body, code = json.dumps({"success": False}).encode(), 401
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *a):
            pass

    HTTPServer(("127.0.0.1", port), H).serve_forever()


if "--stub" in sys.argv:
    run_stub(int(sys.argv[sys.argv.index("--stub") + 1]))
    sys.exit(0)

from playwright.sync_api import sync_playwright

WEB = os.environ.get("WEB", "http://localhost:3109")
passed = failed = 0


def check(ok, name, extra=""):
    global passed, failed
    if ok:
        passed += 1
        print("  ok  ", name)
    else:
        failed += 1
        print("  FAIL", name, extra)


with sync_playwright() as pw:
    b = pw.chromium.launch()
    for width in (375, 1280):
        c = b.new_context(viewport={"width": width, "height": 800})
        pg = c.new_page()
        pg.goto(f"{WEB}/e/{SLUG}")
        pg.wait_for_selector("text=App Card Party", timeout=60000)
        pg.wait_for_timeout(800)
        card = pg.locator("[data-testid=get-the-app]")
        check(card.count() == 1, f"{width}: card shown once")
        txt = card.inner_text() if card.count() else ""
        check("Get the Outsyde app" in txt, f"{width}: title", txt)
        check("Faster checkout and all your tickets in one place." in txt, f"{width}: body", txt)
        check("Wallet" not in txt, f"{width}: no Wallet mention yet", txt)
        ios = card.locator("a", has_text="Download on the App Store")
        play = card.locator("a", has_text="Get it on Google Play")
        check(ios.count() == 1 and ios.get_attribute("href") == "https://apps.apple.com/app/outsyde/id6738926870", f"{width}: App Store link")
        check(play.count() == 1 and play.get_attribute("href") == "https://play.google.com/store/apps/details?id=com.outsyde.app", f"{width}: Play link")
        check(ios.count() == 1 and ios.get_attribute("target") == "_blank" and "noopener" in (ios.get_attribute("rel") or ""), f"{width}: opens in a new tab safely")
        # The card must never sit under the fixed buy bar once scrolled to the end.
        pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        pg.wait_for_timeout(300)
        bar = pg.locator(".ev-bar")
        if card.count() == 0:
            check(False, f"{width}: card clears the buy bar", "no card")
        elif bar.count():
            cb, bb = card.bounding_box(), bar.bounding_box()
            check(cb is not None and bb is not None and cb["y"] + cb["height"] <= bb["y"] + 0.5, f"{width}: card clears the buy bar", f"{cb} {bb}")
        else:
            check(False, f"{width}: buy bar present for an on-sale free type")
        horiz = pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        check(horiz, f"{width}: no sideways scroll")
        c.close()
    # A missing event is a 404 with no card.
    c = b.new_context()
    pg = c.new_page()
    resp = pg.goto(f"{WEB}/e/not-a-real-event")
    check(resp is not None and resp.status == 404, "missing event is a 404")
    check(pg.locator("[data-testid=get-the-app]").count() == 0, "no card on a 404")
    b.close()

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
