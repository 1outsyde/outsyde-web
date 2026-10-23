import { NextRequest, NextResponse } from "next/server";

/**
 * Relays an email unsubscribe click on www.goutsyde.com to outsyde-backend, so the links in our
 * emails point at our own domain instead of the backend host (spam filters penalize links to a
 * different host than the sender). The backend does the real work: it checks the signed link and
 * records the opt out. Handles both the link click (GET) and Gmail/Yahoo one click (POST,
 * RFC 8058 List-Unsubscribe-Post). Only u and s are forwarded.
 */

const PAGE = (title: string, body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#04100d;color:#F5F0E6;font-family:system-ui,-apple-system,Segoe UI,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;box-sizing:border-box">
<main style="max-width:420px;text-align:center"><div style="color:#E8B930;letter-spacing:.2em;font-weight:700;margin-bottom:16px">OUTSYDE</div><h1 style="font-size:24px;margin:0 0 12px">${title}</h1><p style="color:rgba(245,240,230,.75);line-height:1.6;margin:0">${body}</p></main></body></html>`;

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex",
};

function html(status: number, body: string) {
  return new NextResponse(body, { status, headers: HEADERS });
}

export async function relayUnsubscribe(req: NextRequest, backendPath: "/api/account-setup/unsubscribe" | "/api/broadcasts/unsubscribe") {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const s = req.nextUrl.searchParams.get("s") ?? "";
  if (!u || !s || u.length > 200 || s.length > 64) {
    return html(400, PAGE("This link isn't valid", "Reply to any Outsyde email or write info@goutsyde.com and we'll take you off the list."));
  }

  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("unsubscribe relay: OUTSYDE_BACKEND_URL is not set");
    return html(500, PAGE("Something went wrong", "Please try the link again, or write info@goutsyde.com."));
  }

  const qs = new URLSearchParams({ u, s }).toString();
  try {
    const res = await fetch(`${backendUrl.replace(/\/+$/, "")}${backendPath}?${qs}`, {
      method: req.method === "POST" ? "POST" : "GET",
      headers: req.method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
      body: req.method === "POST" ? "List-Unsubscribe=One-Click" : undefined,
      cache: "no-store",
    });
    const text = await res.text();
    const isHtml = (res.headers.get("content-type") ?? "").includes("text/html");
    if (isHtml && text) return html(res.status, text);
    return res.ok
      ? html(200, PAGE("You're unsubscribed", "Booking, order and account emails will still arrive as usual."))
      : html(res.status >= 500 ? 502 : res.status, PAGE("Something went wrong", "Please try the link again, or write info@goutsyde.com."));
  } catch {
    return html(502, PAGE("Something went wrong", "Please try the link again, or write info@goutsyde.com."));
  }
}
