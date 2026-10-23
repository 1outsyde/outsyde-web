"""LOCAL ONLY. An event that started 1 hour ago and ends in 2 hours: no Get tickets or RSVP, shows the started line. Also checks /events/payouts HTML has the fonts link."""
import re, sys, time, json, subprocess, urllib.request
exec(open("tests/tickets.browser.py").read().split("host, g1, g2")[0])
host = mkuser("host"); ht = tok(host)
ev, ty = None, None
body = {"title": f"{P} started", "startsAt": iso(10), "endsAt": iso(10, 4), "timezone": "America/New_York", "venueName": "The Hall", "addressLine1": "12 Main St", "city": "Freeport", "state": "NY", "postalCode": "11520", "capacity": 30}
ev = api("POST", "/api/events", ht, body)["event"]
ty = api("POST", f"/api/events/{ev['id']}/ticket-types", ht, {"name": "Free RSVP", "priceCents": 0, "quantity": 10})["ticketType"]
api("POST", f"/api/events/{ev['id']}/publish", ht)
sql(f"UPDATE events SET starts_at=now()-interval '1 hour', ends_at=now()+interval '2 hours' WHERE id='{ev['id']}'")
with sync_playwright() as pw:
    b = pw.chromium.launch(); c = b.new_context(viewport={"width": 390, "height": 900})
    c.route(re.compile(r"^https?://(?!localhost)"), lambda r: r.abort())
    pg = c.new_page(); pg.goto(f"{WEB}/e/{ev['slug']}"); pg.wait_for_timeout(1500)
    txt = pg.inner_text("body")
    check("This event has started." in txt, "started line shown", txt[:300])
    btns = pg.locator("button").all_inner_texts(); check(not any(x.strip() in ("Get tickets", "RSVP") for x in btns), "no Get tickets or RSVP button", btns)
    check("This event has ended." not in txt, "not shown as ended")
    b.close()
html = urllib.request.urlopen(WEB + "/events/payouts").read().decode()
check("fonts.googleapis" in html, "payouts HTML has the Google Fonts link")
sql(f"DELETE FROM ticket_types WHERE event_id='{ev['id']}'"); sql(f"DELETE FROM events WHERE id='{ev['id']}'"); sql(f"DELETE FROM users WHERE email LIKE '{P}-%'")
print(f"\n{passed} passed, {failed} failed"); sys.exit(1 if failed else 0)
