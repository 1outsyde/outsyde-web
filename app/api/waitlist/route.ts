// app/api/waitlist/route.ts
// Vendor coming-soon waitlist signups.
// 1. Persists the signup to outsyde-backend (best-effort).
// 2. Sends a branded confirmation to the subscriber.
// 3. Sends an admin notification to info@goutsyde.com.
//
// IMPORTANT: `from` must use the Resend-verified domain (info.goutsyde.com).
// Using any unverified address (e.g. hello@goutsyde.com) causes Resend to
// silently reject the send — this was the root cause of emails not arriving.
//
// Required env vars: RESEND_API_KEY, OUTSYDE_BACKEND_URL

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const FROM_ADDRESS = "OutsYde <orders@info.goutsyde.com>";
const ADMIN_EMAIL = "info@goutsyde.com";

const resend = new Resend(process.env.RESEND_API_KEY);

const VENDOR_NAMES: Record<string, string> = {
  "xo-beauty": "XO Beauty & Lashes",
  "braids-with-love": "Braids With Love",
};

export async function POST(req: NextRequest) {
  try {
    const { email, vendor } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanVendor = typeof vendor === "string" ? vendor.trim() : "";
    const vendorName = VENDOR_NAMES[cleanVendor] ?? cleanVendor;

    // ── Persist to outsyde-backend (best-effort, non-blocking) ───────────────
    const backendUrl = process.env.OUTSYDE_BACKEND_URL;
    if (backendUrl) {
      fetch(`${backendUrl}/waitlist-signups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, vendor: cleanVendor }),
      }).catch((err) => console.error("[waitlist] DB persist failed:", err));
    } else {
      console.warn("[waitlist] OUTSYDE_BACKEND_URL not set — signup not persisted");
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Send emails in parallel, log individual failures without aborting
    const [confirmResult, adminResult] = await Promise.allSettled([
      // Confirmation to subscriber
      resend.emails.send({
        from: FROM_ADDRESS,
        to: cleanEmail,
        subject: `You're on the list — ${vendorName} is coming to OutsYde`,
        html: `
          <div style="background:#000;color:#F5F0E6;font-family:system-ui,sans-serif;padding:48px 32px;max-width:520px;margin:0 auto;">
            <p style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#E8B930;margin-bottom:24px;">OutsYde Marketplace</p>
            <h1 style="font-size:28px;font-weight:400;margin-bottom:16px;line-height:1.1;">${vendorName} is coming soon.</h1>
            <p style="font-size:14px;line-height:1.7;color:rgba(245,240,230,.75);margin-bottom:32px;">
              You're on the early access list. We'll reach out the moment ${vendorName} opens on OutsYde — you'll be among the first to book, shop, and earn Outsyde Rewards points.
            </p>
            <hr style="border:none;border-top:1px solid rgba(245,240,230,.1);margin-bottom:32px;" />
            <p style="font-size:11px;color:rgba(245,240,230,.35);line-height:1.6;">
              You're receiving this because you signed up at goutsyde.com.<br/>
              © ${new Date().getFullYear()} OutsYde
            </p>
          </div>
        `,
      }),

      // Admin notification
      resend.emails.send({
        from: FROM_ADDRESS,
        to: ADMIN_EMAIL,
        subject: `New waitlist signup — ${vendorName}`,
        html: `
          <p><strong>Vendor:</strong> ${vendorName} (${cleanVendor})</p>
          <p><strong>Email:</strong> ${cleanEmail}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        `,
      }),
    ]);

    if (confirmResult.status === "rejected") {
      console.error("[waitlist] subscriber confirmation failed:", confirmResult.reason);
    }
    if (adminResult.status === "rejected") {
      console.error("[waitlist] admin notification failed:", adminResult.reason);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waitlist] POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}