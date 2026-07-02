// lib/emails.ts
// Ported from your Wix emailManager.jsw — same Resend setup, same branded HTML.
//
// WHERE THIS GOES:  outsyde-web/lib/emails.ts
// Needs (in .env.local / Vercel):  RESEND_API_KEY
//
// FROM ADDRESS: must use the Resend-VERIFIED domain (info.goutsyde.com).
// Replies route to the info@goutsyde.com Google Workspace inbox via reply_to.

const RESEND_API = "https://api.resend.com/emails";

const FROM_ADDRESS = "Go Outsyde <orders@info.goutsyde.com>";
const REPLY_TO = "info@goutsyde.com";

type Addr = { line1?: string; city?: string; state?: string; postal_code?: string; country?: string };
type Item = { description?: string; title?: string; quantity?: number; amount_total?: number };

async function sendEmail({
  to, subject, html, body = "", reply_to,
}: { to: string | string[]; subject: string; html?: string; body?: string; reply_to?: string }) {
  if (!to || !subject) return false;
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing RESEND_API_KEY");
    const recipients = Array.isArray(to) ? to : [to];
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        reply_to: reply_to ?? REPLY_TO,
        to: recipients,
        subject,
        ...(html ? { html } : { text: body }),
      }),
    });
    if (!res.ok) {
      console.error("❌ Resend error:", JSON.stringify(await res.json()));
      return false;
    }
    return true;
  } catch (err) {
    console.error("❌ Email send failed:", err);
    return false;
  }
}

function rows(items: Item[], light = false) {
  const border = light ? "#e8e0d0" : "#2a2a2a";
  const color = light ? "#333" : "#ffffff";
  return items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid ${border};color:${color};font-size:13px;">${item.description || item.title || "Product"}</td>
      <td style="padding:8px 12px;border-bottom:1px solid ${border};color:${color};font-size:13px;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid ${border};color:${color};font-size:13px;text-align:right;">$${((item.amount_total || 0) / 100).toFixed(2)}</td>
    </tr>`
    )
    .join("");
}

// ===== EMAIL 3 — GO OUTSYDE SALE NOTIFICATION =====
export async function sendOutsydeSaleNotification(p: {
  customerName: string; customerEmail: string; customerPhone: string; orderId: string; items: Item[];
  baseTotalCents: number; customerTotalCents: number; platformFeeCents: number;
  vendorPayoutCents: number; shippingAddress: Addr;
}) {
  const baseTotal = (p.baseTotalCents / 100).toFixed(2);
  const customerTotal = (p.customerTotalCents / 100).toFixed(2);
  const platformFee = (p.platformFeeCents / 100).toFixed(2);
  const vendorPayout = (p.vendorPayoutCents / 100).toFixed(2);
  const a = p.shippingAddress || {};

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td align="center" style="padding:0 0 32px 0;">
      <h1 style="color:#E8B930;font-size:28px;letter-spacing:4px;margin:0;text-transform:uppercase;">GO OUTSYDE</h1>
      <p style="color:#666;font-size:11px;letter-spacing:2px;margin:4px 0 0 0;text-transform:uppercase;">Like A Lavished Local</p></td></tr>
    <tr><td style="background-color:#E8B930;padding:16px 24px;border-radius:4px 4px 0 0;"><h2 style="color:#0a0a0a;margin:0;font-size:18px;">💰 New Sale — Lotus House Blends</h2></td></tr>
    <tr><td style="background-color:#141414;padding:24px;border-radius:0 0 4px 4px;">
      <h3 style="color:#E8B930;margin:0 0 12px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Customer</h3>
      <p style="color:#ffffff;margin:0 0 4px 0;font-size:15px;">${p.customerName}</p>
      <p style="color:#999;margin:0 0 4px 0;font-size:13px;">${p.customerEmail}</p>
      <p style="color:#999;margin:0 0 4px 0;font-size:13px;">📞 ${p.customerPhone || "No phone provided"}</p>
      <p style="color:#666;margin:0 0 24px 0;font-size:12px;">Order ID: ${p.orderId}</p>
      <h3 style="color:#E8B930;margin:0 0 12px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Items Sold</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #2a2a2a;border-radius:4px;">
        <tr style="background-color:#1e1e1e;"><th style="padding:8px 12px;text-align:left;color:#999;font-size:12px;">Item</th><th style="padding:8px 12px;text-align:center;color:#999;font-size:12px;">Qty</th><th style="padding:8px 12px;text-align:right;color:#999;font-size:12px;">Amount</th></tr>
        ${rows(p.items)}</table>
      <h3 style="color:#E8B930;margin:0 0 12px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Revenue Breakdown</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background-color:#1e1e1e;border-radius:4px;">
        <tr><td style="padding:8px 16px;color:#999;font-size:13px;">Base Total</td><td style="padding:8px 16px;color:#ffffff;font-size:13px;text-align:right;">$${baseTotal}</td></tr>
        <tr><td style="padding:8px 16px;color:#999;font-size:13px;">Customer Paid (+ service fee/tax)</td><td style="padding:8px 16px;color:#ffffff;font-size:13px;text-align:right;">$${customerTotal}</td></tr>
        <tr><td style="padding:8px 16px;color:#999;font-size:13px;">Vendor Payout (-7%)</td><td style="padding:8px 16px;color:#ffffff;font-size:13px;text-align:right;">$${vendorPayout}</td></tr>
        <tr style="border-top:1px solid #2a2a2a;"><td style="padding:10px 16px;color:#E8B930;font-size:15px;font-weight:700;">Go Outsyde Earned</td><td style="padding:10px 16px;color:#E8B930;font-size:15px;font-weight:700;text-align:right;">$${platformFee}</td></tr></table>
      <h3 style="color:#E8B930;margin:0 0 12px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Ship To</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1e1e1e;border-radius:4px;">
        <tr><td style="padding:8px 16px;color:#ffffff;font-size:13px;">${a.line1 || ""}</td></tr>
        <tr><td style="padding:4px 16px;color:#ffffff;font-size:13px;">${a.city || ""}, ${a.state || ""} ${a.postal_code || ""}</td></tr>
        <tr><td style="padding:4px 16px 12px 16px;color:#999;font-size:12px;">${a.country || ""}</td></tr></table>
    </td></tr>
    <tr><td align="center" style="padding:24px 0 0 0;"><p style="color:#444;font-size:11px;margin:0;">© ${new Date().getFullYear()} Go Outsyde. All rights reserved.</p></td></tr>
  </table></td></tr></table></body></html>`;

  return sendEmail({ to: "info@goutsyde.com", subject: `💰 New Sale: ${p.customerName} — $${platformFee} earned`, html });
}

// ===== EMAIL 2 — LOTUS VENDOR NOTIFICATION =====
export async function sendLotusOrderNotification(p: {
  customerName: string; customerEmail: string; customerPhone: string; orderId: string; items: Item[];
  vendorPayoutCents: number; shippingAddress: Addr;
}) {
  const vendorPayout = (p.vendorPayoutCents / 100).toFixed(2);
  const a = p.shippingAddress || {};

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#f5f0e8;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0e8;padding:40px 20px;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td align="center" style="padding:0 0 32px 0;">
      <h1 style="color:#5b3d8f;font-size:26px;letter-spacing:3px;margin:0;text-transform:uppercase;">Lotus House Blends</h1>
      <p style="color:#999;font-size:11px;letter-spacing:2px;margin:4px 0 0 0;text-transform:uppercase;">Order Notification</p></td></tr>
    <tr><td style="background-color:#5b3d8f;padding:16px 24px;border-radius:4px 4px 0 0;"><h2 style="color:#ffffff;margin:0;font-size:18px;">🛍️ New Order Received</h2></td></tr>
    <tr><td style="background-color:#ffffff;padding:24px;border-radius:0 0 4px 4px;">
      <h3 style="color:#5b3d8f;margin:0 0 12px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Customer Info</h3>
      <p style="color:#333;margin:0 0 4px 0;font-size:15px;">${p.customerName}</p>
      <p style="color:#666;margin:0 0 4px 0;font-size:13px;">${p.customerEmail}</p>
      <p style="color:#666;margin:0 0 4px 0;font-size:13px;">📞 ${p.customerPhone || "No phone provided"}</p>
      <p style="color:#999;margin:0 0 24px 0;font-size:12px;">Order ID: ${p.orderId}</p>
      <h3 style="color:#5b3d8f;margin:0 0 12px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Items To Fulfill</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e8e0d0;border-radius:4px;">
        <tr style="background-color:#f5f0e8;"><th style="padding:8px 12px;text-align:left;color:#666;font-size:12px;">Item</th><th style="padding:8px 12px;text-align:center;color:#666;font-size:12px;">Qty</th><th style="padding:8px 12px;text-align:right;color:#666;font-size:12px;">Amount</th></tr>
        ${rows(p.items, true)}</table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background-color:#f5f0e8;border-radius:4px;">
        <tr><td style="padding:12px 16px;color:#5b3d8f;font-size:16px;font-weight:700;">Your Payout</td><td style="padding:12px 16px;color:#5b3d8f;font-size:16px;font-weight:700;text-align:right;">$${vendorPayout}</td></tr>
        <tr><td colspan="2" style="padding:0 16px 12px 16px;color:#999;font-size:12px;">Expected transfer: within 2-3 business days</td></tr></table>
      <h3 style="color:#5b3d8f;margin:0 0 12px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Ship To</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0e8;border-radius:4px;">
        <tr><td style="padding:8px 16px;color:#333;font-size:13px;font-weight:600;">${p.customerName}</td></tr>
        <tr><td style="padding:4px 16px;color:#333;font-size:13px;">${a.line1 || ""}</td></tr>
        <tr><td style="padding:4px 16px;color:#333;font-size:13px;">${a.city || ""}, ${a.state || ""} ${a.postal_code || ""}</td></tr>
        <tr><td style="padding:4px 16px 12px 16px;color:#666;font-size:12px;">${a.country || ""}</td></tr></table>
      <p style="color:#999;font-size:12px;margin:24px 0 0 0;text-align:center;">Please ship this order promptly. Questions? Contact info@goutsyde.com</p>
    </td></tr>
    <tr><td align="center" style="padding:24px 0 0 0;"><p style="color:#999;font-size:11px;margin:0;">© ${new Date().getFullYear()} Go Outsyde. All rights reserved.</p></td></tr>
  </table></td></tr></table></body></html>`;

  return sendEmail({ to: "lotushouseblends25@gmail.com", subject: `🛍️ New Order: ${p.customerName} — Please Ship`, html });
}

// ===== EMAIL 1 — CUSTOMER ORDER CONFIRMATION =====
export async function sendCustomerOrderConfirmation(p: {
  customerName: string; customerEmail: string; orderId: string; items: Item[];
  customerTotalCents: number; shippingAddress: Addr;
}) {
  const customerTotal = (p.customerTotalCents / 100).toFixed(2);
  const a = p.shippingAddress || {};

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td align="center" style="padding:0 0 32px 0;">
      <h1 style="color:#E8B930;font-size:28px;letter-spacing:4px;margin:0;text-transform:uppercase;">GO OUTSYDE</h1>
      <p style="color:#666;font-size:11px;letter-spacing:2px;margin:4px 0 0 0;text-transform:uppercase;">Like A Lavished Local</p></td></tr>
    <tr><td style="background-color:#E8B930;padding:16px 24px;border-radius:4px 4px 0 0;"><h2 style="color:#0a0a0a;margin:0;font-size:18px;">🎉 Order Confirmed!</h2></td></tr>
    <tr><td style="background-color:#141414;padding:24px;border-radius:0 0 4px 4px;">
      <p style="color:#ffffff;font-size:15px;margin:0 0 24px 0;">Hey ${p.customerName}, thank you for your order! Your items are being prepared and will ship soon.</p>
      <h3 style="color:#E8B930;margin:0 0 12px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Your Order</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #2a2a2a;border-radius:4px;">
        <tr style="background-color:#1e1e1e;"><th style="padding:8px 12px;text-align:left;color:#999;font-size:12px;">Item</th><th style="padding:8px 12px;text-align:center;color:#999;font-size:12px;">Qty</th><th style="padding:8px 12px;text-align:right;color:#999;font-size:12px;">Amount</th></tr>
        ${rows(p.items)}
        <tr><td colspan="2" style="padding:10px 12px;color:#E8B930;font-size:14px;font-weight:700;">Total Paid</td><td style="padding:10px 12px;color:#E8B930;font-size:14px;font-weight:700;text-align:right;">$${customerTotal}</td></tr></table>
      <h3 style="color:#E8B930;margin:0 0 12px 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Shipping To</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1e1e1e;border-radius:4px;margin-bottom:24px;">
        <tr><td style="padding:8px 16px;color:#ffffff;font-size:13px;font-weight:600;">${p.customerName}</td></tr>
        <tr><td style="padding:4px 16px;color:#ffffff;font-size:13px;">${a.line1 || ""}</td></tr>
        <tr><td style="padding:4px 16px;color:#ffffff;font-size:13px;">${a.city || ""}, ${a.state || ""} ${a.postal_code || ""}</td></tr>
        <tr><td style="padding:4px 16px 12px 16px;color:#999;font-size:12px;">${a.country || ""}</td></tr></table>
      <p style="color:#999;font-size:12px;margin:0;text-align:center;">Questions? Contact us at <a href="mailto:info@goutsyde.com" style="color:#E8B930;">info@goutsyde.com</a></p>
    </td></tr>
    <tr><td align="center" style="padding:24px 0 0 0;"><p style="color:#444;font-size:11px;margin:0;">© ${new Date().getFullYear()} Go Outsyde. All rights reserved.</p></td></tr>
  </table></td></tr></table></body></html>`;

  return sendEmail({ to: p.customerEmail, subject: `🎉 Order Confirmed — Go Outsyde`, html });
}

// ===== NOTIFY LIST — INTERNAL ALERT TO OUTSYDE =====
export async function sendNotifySignupAlert(p: { email: string }) {
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td align="center" style="padding:0 0 32px 0;">
      <h1 style="color:#E8B930;font-size:28px;letter-spacing:4px;margin:0;text-transform:uppercase;">GO OUTSYDE</h1>
      <p style="color:#666;font-size:11px;letter-spacing:2px;margin:4px 0 0 0;text-transform:uppercase;">Like A Lavished Local</p></td></tr>
    <tr><td style="background-color:#E8B930;padding:16px 24px;border-radius:4px 4px 0 0;"><h2 style="color:#0a0a0a;margin:0;font-size:18px;">🔔 New Notify-List Signup</h2></td></tr>
    <tr><td style="background-color:#141414;padding:24px;border-radius:0 0 4px 4px;">
      <p style="color:#999;margin:0 0 8px 0;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Email</p>
      <p style="color:#ffffff;margin:0 0 4px 0;font-size:18px;font-weight:600;">${p.email}</p>
      <p style="color:#666;margin:16px 0 0 0;font-size:12px;">Captured from the Coming Soon page.</p>
    </td></tr>
    <tr><td align="center" style="padding:24px 0 0 0;"><p style="color:#444;font-size:11px;margin:0;">© ${new Date().getFullYear()} Go Outsyde. All rights reserved.</p></td></tr>
  </table></td></tr></table></body></html>`;

  return sendEmail({
    to: "info@goutsyde.com",
    subject: `🔔 New notify-list signup: ${p.email}`,
    html,
  });
}

// ===== NOTIFY LIST — BRANDED CONFIRMATION TO THE SIGNER =====
export async function sendNotifySignupConfirmation(p: { email: string }) {
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td align="center" style="padding:0 0 32px 0;">
      <h1 style="color:#E8B930;font-size:28px;letter-spacing:4px;margin:0;text-transform:uppercase;">GO OUTSYDE</h1>
      <p style="color:#666;font-size:11px;letter-spacing:2px;margin:4px 0 0 0;text-transform:uppercase;">Like A Lavished Local</p></td></tr>
    <tr><td style="background-color:#E8B930;padding:16px 24px;border-radius:4px 4px 0 0;"><h2 style="color:#0a0a0a;margin:0;font-size:18px;">🎉 You're on the list</h2></td></tr>
    <tr><td style="background-color:#141414;padding:24px;border-radius:0 0 4px 4px;">
      <p style="color:#ffffff;font-size:15px;line-height:1.7;margin:0 0 16px 0;">Thanks for signing up. You'll be among the first to know the moment this part of Outsyde goes live.</p>
      <p style="color:#999;font-size:14px;line-height:1.7;margin:0 0 24px 0;">We're building a place where culture meets commerce — shop local brands, book photographers, and discover the people shaping your city. More soon.</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:8px 0;">
          <a href="https://goutsyde.com" style="display:inline-block;background-color:#E8B930;color:#0a0a0a;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:12px 28px;border-radius:4px;">Visit Outsyde</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 0 0 0;">
      <p style="color:#666;font-size:12px;margin:0 0 4px 0;">Follow along: <a href="https://instagram.com/go.outsyde" style="color:#E8B930;text-decoration:none;">Instagram</a> · <a href="https://tiktok.com/@go.outsyde" style="color:#E8B930;text-decoration:none;">TikTok</a></p>
      <p style="color:#444;font-size:11px;margin:8px 0 0 0;">© ${new Date().getFullYear()} Go Outsyde. All rights reserved.</p>
    </td></tr>
  </table></td></tr></table></body></html>`;

  return sendEmail({
    to: p.email,
    subject: `🎉 You're on the list — Go Outsyde`,
    html,
  });
}

// ===== ROYAL ELITE MOVING — ESTIMATE REQUEST =====
export async function sendRoyalEliteEstimate(p: {
  name: string;
  email: string;
  phone: string;
  moveDate: string;
  moveType: string;
  homeSize: string;
  fromAddress: string;
  toAddress: string;
  floor: string;
  stops: string;
  notes: string;
}) {
  function row(label: string, value?: string): string {
    return `
      <tr>
        <td style="padding:9px 16px;border-bottom:1px solid #ece9f2;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8a7fa0;white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:9px 16px;border-bottom:1px solid #ece9f2;font-size:14px;color:#1a1a1a;">${value || "&mdash;"}</td>
      </tr>`;
  }

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #ece9f2;border-radius:8px;overflow:hidden;">
    <div style="background:#3A1A5C;padding:24px;">
      <div style="color:#E2C361;font-size:11px;letter-spacing:.2em;text-transform:uppercase;">Royal Elite Moving &middot; via Outsyde</div>
      <div style="color:#ffffff;font-size:21px;font-weight:bold;margin-top:7px;">New Move Request</div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${row("Customer Name",       p.name || "New Customer")}
      ${row("Email",               p.email)}
      ${row("Phone",               p.phone)}
      ${row("Preferred Move Date", p.moveDate)}
      ${row("Move Type",           p.moveType)}
      ${row("Home Size",           p.homeSize)}
      ${row("Pickup Address",      p.fromAddress)}
      ${row("Drop-off Address",    p.toAddress)}
      ${row("Floor",               p.floor)}
      ${row("Additional Stops",    p.stops || "None")}
      ${row("Notes / Special Items", p.notes || "None")}
    </table>
    <div style="padding:16px 24px;font-size:12px;color:#999;border-top:1px solid #ece9f2;">
      Reply to this email to reach the customer directly at ${p.email}.
    </div>
  </div>`;

  // Sends to BOTH Go Outsyde and the Royal Elite vendor in one call.
  // reply_to is the customer so either inbox can reply straight to the lead.
  return sendEmail({
    to: ["info@goutsyde.com", "Bprovisionproperties@yahoo.com"],
    reply_to: p.email,
    subject: `New Move Request — ${p.name || "Royal Elite Moving"}`,
    html,
  });
}


// ─────────────────────────────────────────────────────────────
// APPEND THIS ENTIRE BLOCK TO THE BOTTOM OF:  lib/emails.ts
// ─────────────────────────────────────────────────────────────

// TODO: Replace with Omega's real business inbox once they provide it.
// Until then, leads only go to info@goutsyde.com — nothing is lost,
// you'll just need to forward manually. Once you have it, put the
// real address here and Omega starts getting leads directly.
const OMEGA_VENDOR_EMAIL = ""; // e.g. "omegalifestyle@gmail.com"

function omegaRecipients(): string[] {
  return OMEGA_VENDOR_EMAIL
    ? ["info@goutsyde.com", OMEGA_VENDOR_EMAIL]
    : ["info@goutsyde.com"];
}

// ===== OMEGA LIFESTYLE — FREE CONSULTATION BOOKING =====
export async function sendOmegaConsultation(p: {
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  goals: string;
  heardAbout: string;
}) {
  function row(label: string, value?: string): string {
    return `
      <tr>
        <td style="padding:9px 16px;border-bottom:1px solid #2a2a2a;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#999;white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:9px 16px;border-bottom:1px solid #2a2a2a;font-size:14px;color:#ffffff;">${value || "&mdash;"}</td>
      </tr>`;
  }

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">
    <div style="background:#E2231A;padding:24px;">
      <div style="color:#0a0a0a;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:bold;">Omega Lifestyle Coaching &middot; via Outsyde</div>
      <div style="color:#0a0a0a;font-size:21px;font-weight:bold;margin-top:7px;">New Free Consultation Request</div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${row("Name", p.name || "New Lead")}
      ${row("Email", p.email)}
      ${row("Phone", p.phone)}
      ${row("Preferred Date", p.preferredDate)}
      ${row("Preferred Time", p.preferredTime)}
      ${row("Goals", p.goals)}
      ${row("Heard About Omega Via", p.heardAbout || "Not specified")}
    </table>
    <div style="padding:16px 24px;font-size:12px;color:#777;border-top:1px solid #2a2a2a;">
      Reply to this email to reach the client directly at ${p.email}.
    </div>
  </div>`;

  return sendEmail({
    to: omegaRecipients(),
    reply_to: p.email,
    subject: `New Consultation Request — ${p.name || "Omega Lifestyle"}`,
    html,
  });
}

// ===== OMEGA LIFESTYLE — MEAL PLAN INTAKE =====
export async function sendOmegaMealPlan(p: {
  name: string;
  email: string;
  phone: string;
  goal: string;
  activityLevel: string;
  allergies: string;
  dietaryPreference: string;
  notes: string;
}) {
  function row(label: string, value?: string): string {
    return `
      <tr>
        <td style="padding:9px 16px;border-bottom:1px solid #2a2a2a;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#999;white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:9px 16px;border-bottom:1px solid #2a2a2a;font-size:14px;color:#ffffff;">${value || "&mdash;"}</td>
      </tr>`;
  }

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">
    <div style="background:#E2231A;padding:24px;">
      <div style="color:#0a0a0a;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:bold;">Omega Lifestyle Coaching &middot; via Outsyde</div>
      <div style="color:#0a0a0a;font-size:21px;font-weight:bold;margin-top:7px;">New Meal Plan Request</div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${row("Name", p.name || "New Client")}
      ${row("Email", p.email)}
      ${row("Phone", p.phone)}
      ${row("Goal", p.goal)}
      ${row("Activity Level", p.activityLevel)}
      ${row("Allergies / Intolerances", p.allergies || "None listed")}
      ${row("Dietary Preference", p.dietaryPreference)}
      ${row("Additional Notes", p.notes || "None")}
    </table>
    <div style="padding:16px 24px;font-size:12px;color:#777;border-top:1px solid #2a2a2a;">
      Reply to this email to reach the client directly at ${p.email}.
    </div>
  </div>`;

  return sendEmail({
    to: omegaRecipients(),
    reply_to: p.email,
    subject: `New Meal Plan Request — ${p.name || "Omega Lifestyle"}`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────
// APPEND THIS TO THE BOTTOM OF:  lib/emails.ts
// (goes after sendOmegaConsultation / sendOmegaMealPlan)
// ─────────────────────────────────────────────────────────────

// ===== OMEGA LIFESTYLE — CONSULTATION CONFIRMATION TO CUSTOMER =====
export async function sendOmegaConsultationConfirmation(p: {
  name: string;
  email: string;
  preferredDate: string;
  preferredTime: string;
}) {
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td align="center" style="padding:0 0 32px 0;">
      <h1 style="color:#E2231A;font-size:26px;letter-spacing:3px;margin:0;text-transform:uppercase;">Omega Lifestyle Coaching</h1>
      <p style="color:#666;font-size:11px;letter-spacing:2px;margin:4px 0 0 0;text-transform:uppercase;">via Go Outsyde</p>
    </td></tr>
    <tr><td style="background-color:#E2231A;padding:16px 24px;border-radius:4px 4px 0 0;">
      <h2 style="color:#0a0a0a;margin:0;font-size:18px;">You're Booked!</h2>
    </td></tr>
    <tr><td style="background-color:#141414;padding:24px;border-radius:0 0 4px 4px;">
      <p style="color:#ffffff;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
        Hey ${p.name || "there"}, your free consultation with Omega Lifestyle Coaching is requested. Omega will reach out shortly to confirm your exact time.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;background-color:#1e1e1e;border-radius:4px;">
        <tr>
          <td style="padding:12px 16px;color:#999;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Preferred Date</td>
          <td style="padding:12px 16px;color:#ffffff;font-size:14px;text-align:right;">${p.preferredDate || "&mdash;"}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#999;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Preferred Time</td>
          <td style="padding:12px 16px;color:#ffffff;font-size:14px;text-align:right;">${p.preferredTime || "&mdash;"}</td>
        </tr>
      </table>
      <p style="color:#999;font-size:13px;line-height:1.7;margin:0;">
        Questions in the meantime? Just reply to this email.
      </p>
    </td></tr>
    <tr><td align="center" style="padding:24px 0 0 0;">
      <p style="color:#444;font-size:11px;margin:0;">© ${new Date().getFullYear()} Omega Lifestyle Coaching &middot; Sold via Go Outsyde Platform</p>
    </td></tr>
  </table></td></tr></table></body></html>`;

  return sendEmail({
    to: p.email,
    subject: `You're Booked — Omega Lifestyle Coaching`,
    html,
  });
}