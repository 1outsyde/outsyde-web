"""
Browser check for the Email card on /account/settings (Playwright for Python, Chromium). LOCAL ONLY.
Run: python3 tests/change-email.browser.py
Env (defaults shown): CEB_WEB_URL=http://localhost:3077  CEB_PG_URL=postgresql://outsyde:outsyde@localhost:5432/outsyde
  CEB_JWT_SECRET=dev-jwt-secret-outsyde-2024  CEB_BACKEND_DIR=/home/claude/outsyde-backend  CEB_RESEND_PORT=5098
  CEB_SHOTS=<dir for screenshots> (optional)
Needs the backend started with RESEND_API_KEY=re_test and RESEND_BASE_URL=http://127.0.0.1:<CEB_RESEND_PORT>; this
script runs that Resend stub and reads the code from the email. Skips (exit 0) when the site is not up.
Seeds one user "ceb-ui" (password secret123) and removes it at the end. Needs psql and node on PATH.
"""
import json, os, re, subprocess, sys, threading, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

WEB = os.environ.get("CEB_WEB_URL", "http://localhost:3077")
PG = os.environ.get("CEB_PG_URL", "postgresql://outsyde:outsyde@localhost:5432/outsyde")
SECRET = os.environ.get("CEB_JWT_SECRET", "dev-jwt-secret-outsyde-2024")
BDIR = os.environ.get("CEB_BACKEND_DIR", "/home/claude/outsyde-backend")
RESEND_PORT = int(os.environ.get("CEB_RESEND_PORT", "5098"))
SHOTS = os.environ.get("CEB_SHOTS")

for u in (WEB, PG):
    if urlparse(u).hostname not in ("localhost", "127.0.0.1", "::1"):
        sys.exit("refusing to run: CEB_WEB_URL and CEB_PG_URL must be localhost")
try:
    urllib.request.urlopen(WEB, timeout=5)
except Exception:
    print(f"skipped: site not reachable at {WEB}")
    sys.exit(0)

mails = []
class Stub(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        mails.append(body)
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(json.dumps({"id": f"stub_{len(mails)}"}).encode())
    def log_message(self, *a): pass
stub = HTTPServer(("127.0.0.1", RESEND_PORT), Stub)
threading.Thread(target=stub.serve_forever, daemon=True).start()

def psql(sql):
    return subprocess.run(["psql", PG, "-tAc", sql], capture_output=True, text=True, check=True).stdout.strip()

def node(js):
    return subprocess.run(["node", "-e", js], cwd=BDIR, capture_output=True, text=True, check=True).stdout.strip()

def code_for(to):
    for m in reversed(mails):
        tos = m.get("to") if isinstance(m.get("to"), list) else [m.get("to")]
        if to in tos and "email change code" in (m.get("subject") or "").lower():
            found = re.search(r">(\d{6})<", m.get("html") or "")
            return found.group(1) if found else None
    return None

passed = failed = 0
def check(cond, name):
    global passed, failed
    if cond: passed += 1; print(f"  ok  {name}")
    else: failed += 1; print(f"  FAIL {name}")

def shot(page, name):
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        page.screenshot(path=os.path.join(SHOTS, f"{name}.png"), full_page=True)

hash_ = node("require('bcrypt').hash('secret123',4).then(h=>console.log(h))")
psql("DELETE FROM users WHERE id = 'ceb-ui'")
psql(f"INSERT INTO users (id, username, email, password) VALUES ('ceb-ui', 'cebui', 'ceb-ui@old.test', '{hash_}')")
token = node(f"console.log(require('jsonwebtoken').sign({{userId:'ceb-ui',isVendor:false}}, '{SECRET}', {{expiresIn:'1h'}}))")

from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width, label in ((1280, "desktop"), (390, "phone")):
            ctx = browser.new_context(viewport={"width": width, "height": 900})
            ctx.add_cookies([{"name": "outsyde_access_token", "value": token, "url": WEB}])
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(f"{WEB}/account/settings", wait_until="networkidle")
            card = page.locator("#email")
            check(card.is_visible(), f"{label}: Email card shows on Settings")
            current = psql("SELECT email FROM users WHERE id = 'ceb-ui'")
            check(page.get_by_test_id("current-email").inner_text().strip() == current, f"{label}: shows the current email ({current})")
            check(page.locator(".card-title", has_text="Delete Account").is_visible(), f"{label}: Delete Account card still there")
            no_scroll = page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
            check(no_scroll, f"{label}: no sideways scroll")
            shot(page, f"{label}-1-view")

            if label == "desktop":
                card.get_by_role("button", name="Change email").click()
                check(page.locator("#ce-pw").is_visible(), "password box shows for a password account")
                page.locator("#ce-pw").fill("secret123")
                check(page.locator("#ce-pw").get_attribute("type") == "password", "password hidden by default")
                page.get_by_role("button", name="Show password").click()
                check(page.locator("#ce-pw").get_attribute("type") == "text", "eye shows the password")
                page.get_by_role("button", name="Hide password").click()

                page.locator("#ce-new").fill(current.upper())
                card.get_by_role("button", name="Send code").click()
                check(card.get_by_role("alert").inner_text().strip() == "That's already your email.", "same email refused in the page")

                page.locator("#ce-new").fill("ceb-ui-new@new.test")
                page.locator("#ce-pw").fill("wrongpass")
                card.get_by_role("button", name="Send code").click()
                card.get_by_role("alert").wait_for()
                check("password" in card.get_by_role("alert").inner_text().lower(), "wrong password: backend message shown")
                shot(page, f"{label}-2-email-step")

                page.locator("#ce-pw").fill("secret123")
                card.get_by_role("button", name="Send code").click()
                page.get_by_label("6 digit code").wait_for()
                check("ceb-ui-new@new.test" in card.inner_text(), "code step names the new address")
                shot(page, f"{label}-3-code-step")

                page.reload(wait_until="networkidle")
                check(page.get_by_label("6 digit code").is_visible(), "reload with a code waiting opens the code step")

                code = code_for("ceb-ui-new@new.test")
                check(bool(code), "code email went to the new address")
                page.get_by_label("6 digit code").fill("12 34 56" if code != "123456" else "65 43 21")
                check(page.get_by_label("6 digit code").input_value().isdigit(), "pasted spaces are stripped")
                card.get_by_role("button", name="Confirm").click()
                card.get_by_role("alert").wait_for()
                check("tries left" in card.get_by_role("alert").inner_text(), "wrong code shows tries left")

                page.get_by_label("6 digit code").fill(code)
                card.get_by_role("button", name="Confirm").click()
                card.get_by_role("status").wait_for()
                check("ceb-ui-new@new.test" in card.get_by_role("status").inner_text(), "success message names the new email")
                check(page.get_by_test_id("current-email").inner_text().strip() == "ceb-ui-new@new.test", "card shows the new email")
                check(psql("SELECT email FROM users WHERE id = 'ceb-ui'") == "ceb-ui-new@new.test", "email changed in Postgres")
                shot(page, f"{label}-4-done")

            check(not errors, f"{label}: no page errors {errors[:2]}")
            ctx.close()
        browser.close()
finally:
    psql("DELETE FROM audit_logs WHERE target_id = 'ceb-ui'")
    psql("DELETE FROM users WHERE id = 'ceb-ui'")
    stub.shutdown()

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
