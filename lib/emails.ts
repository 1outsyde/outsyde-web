// lib/emails.ts
// Ported from your Wix emailManager.jsw — same Resend setup, same branded HTML.
// Wix's getSecret("RESEND_API_KEY") -> process.env.RESEND_API_KEY
//
// WHERE THIS GOES:  outsyde-web/lib/emails.ts
// Needs (in .env.local):  RESEND_API_KEY

const RESEND_API = "https://api.resend.com/emails";

type Addr = { line1?: string; city?: string; state?: string; postal_code?: string; country?: string };
type Item = { description?: string; title?: string; quantity?: number; amount_total?: number };

async function sendEmail({
  to, subject, html, body = "",
}: { to: string | string[]; subject: string; html?: string; body?: string }) {
  if (!to || !subject) return false;
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing RESEND_API_KEY");
    const recipients = Array.isArray(to) ? to : [to];
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Go Outsyde <info@info.goutsyde.com>",
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
  customerName: string; customerEmail: string; orderId: string; items: Item[];
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
  customerName: string; customerEmail: string; orderId: string; items: Item[];
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