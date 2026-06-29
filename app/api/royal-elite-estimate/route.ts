// app/api/royal-elite-estimate/route.ts
// Receives a move-request / free-estimate submission from the Royal Elite
// storefront (app/shop/royalelite/page.tsx) and emails the lead to BOTH:
//   1) info@goutsyde.com               (you — every lead logged in the Outsyde inbox)
//   2) Bprovisionproperties@yahoo.com  (Royal Elite — so the vendor can act on it)
//
// Sent in a SINGLE Resend call (the `to` field accepts an array). reply_to is set
// to the customer's email, so hitting "Reply" in either inbox goes straight to the lead.
//
// WHERE THIS GOES:  outsyde-web/app/api/royal-elite-estimate/route.ts
// Needs (already in Vercel):  RESEND_API_KEY
// Replaces:  the old Web3Forms POST that used to fire from the page.

import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Every Royal Elite lead goes to both of these.
const RECIPIENTS = ["info@goutsyde.com", "Bprovisionproperties@yahoo.com"];

// Verified Resend sender (matches your Lotus / notify-signup from-address).
const FROM = "Royal Elite Moving <orders@send.goutsyde.com>";

type EstimatePayload = {
  name?: string;
  email?: string;
  phone?: string;
  moveDate?: string;
  moveType?: string;
  homeSize?: string;
  fromAddress?: string;
  toAddress?: string;
  floor?: string;
  stops?: string;
  notes?: string;
};

// Escape anything the customer typed before it lands in the email HTML —
// the form is public, so the inbox is the attack surface.
function esc(s?: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Strip CR/LF so a customer can't inject extra email headers via the subject.
function safeHeader(s?: string): string {
  return String(s ?? "").replace(/[\r\n]/g, " ").slice(0, 200);
}

function row(label: string, value?: string): string {
  return `
    <tr>
      <td style="padding:9px 16px;border-bottom:1px solid #ece9f2;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8a7fa0;white-space:nowrap;vertical-align:top;">${esc(label)}</td>
      <td style="padding:9px 16px;border-bottom:1px solid #ece9f2;font-size:14px;color:#1a1a1a;">${esc(value) || "&mdash;"}</td>
    </tr>`;
}

export async function POST(req: Request) {
  try {
    const d = (await req.json()) as EstimatePayload;

    // Email is the one field we truly need — it's the reply-to / lead contact.
    if (!d.email || typeof d.email !== "string" || !d.email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const customerEmail = d.email.trim();
    const name = (d.name || "").trim() || "New Customer";

    const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #ece9f2;border-radius:8px;overflow:hidden;">
      <div style="background:#3A1A5C;padding:24px;">
        <div style="color:#E2C361;font-size:11px;letter-spacing:.2em;text-transform:uppercase;">Royal Elite Moving &middot; via Outsyde</div>
        <div style="color:#ffffff;font-size:21px;font-weight:bold;margin-top:7px;">New Move Request</div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${row("Customer Name", name)}
        ${row("Email", customerEmail)}
        ${row("Phone", d.phone)}
        ${row("Preferred Move Date", d.moveDate)}
        ${row("Move Type", d.moveType)}
        ${row("Home Size", d.homeSize)}
        ${row("Pickup Address", d.fromAddress)}
        ${row("Drop-off Address", d.toAddress)}
        ${row("Floor", d.floor)}
        ${row("Additional Stops", d.stops || "None")}
        ${row("Notes / Special Items", d.notes || "None")}
      </table>
      <div style="padding:16px 24px;font-size:12px;color:#999;border-top:1px solid #ece9f2;">
        Reply to this email to reach the customer directly at ${esc(customerEmail)}.
      </div>
    </div>`;

    const { error } = await resend.emails.send({
      from: FROM,
      to: RECIPIENTS,
      replyTo: customerEmail,
      subject: safeHeader(`New Move Request — ${name}`),
      html,
    });

    if (error) {
      return NextResponse.json(
        { error: "Could not send your request. Please call 757-944-4925 or try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
