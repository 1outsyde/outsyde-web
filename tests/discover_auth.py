"""
Auth minting for the Discover browser checks (LOCAL ONLY). Never logs in through /api/login.
  token  = JWT signed with the local backend's secret "test"  (cookie outsyde_access_token)
  cookie = connect.sid signed with "localsessionsecret", backed by a row in the local `sessions` table
Needs node on PATH and an outsyde-backend checkout (for jsonwebtoken and cookie-signature).
"""
import json, secrets, subprocess, time


def mint_token(backend_dir, uid):
    code = f'console.log(require("jsonwebtoken").sign({{userId:{json.dumps(uid)},isVendor:false}},"test",{{expiresIn:"1h"}}))'
    return subprocess.run(["node", "-e", code], capture_output=True, text=True, cwd=backend_dir, check=True).stdout.strip()


def mint_session(sql, backend_dir, uid):
    """Insert a session row for uid. Returns (connect.sid cookie value, sid). Delete the row by sid when done."""
    sid = "discover-test-" + secrets.token_hex(8)
    expires = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + 7 * 86400))
    sess = json.dumps({"cookie": {"originalMaxAge": 604800000, "expires": expires, "httpOnly": True, "path": "/"}, "userId": uid})
    sql(f"INSERT INTO sessions (sid, sess, expire) VALUES ('{sid}', '{sess}'::json, now() + interval '7 days')")
    code = f'console.log(encodeURIComponent("s:"+require("cookie-signature").sign({json.dumps(sid)},"localsessionsecret")))'
    value = subprocess.run(["node", "-e", code], capture_output=True, text=True, cwd=backend_dir, check=True).stdout.strip()
    return value, sid


def auth_cookies(sql, backend_dir, uid, web_url):
    """Both cookies for a Playwright context (add_cookies), plus the sid to delete afterwards."""
    value, sid = mint_session(sql, backend_dir, uid)
    return [
        {"name": "outsyde_access_token", "value": mint_token(backend_dir, uid), "url": web_url},
        {"name": "connect.sid", "value": value, "url": web_url},
    ], sid
