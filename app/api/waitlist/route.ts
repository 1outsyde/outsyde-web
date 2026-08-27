// app/api/waitlist/route.ts
// Stores coming-soon email signups.
// Sends a confirmation to the subscriber + an admin notification via Resend.
// Extend with a DB insert (Neon/Prisma) to persist signups long-term.

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Map vendor slugs to display names for the email
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

    const vendorName = VENDOR_NAMES[vendor] ?? vendor;

    // ── Optional: persist to DB ──────────────────────────────────────────────
    // import { db } from "@/lib/db";
    // await db.insert(waitlistTable).values({ email, vendor, createdAt: new Date() })
    //   .onConflictDoNothing();
    // ────────────────────────────────────────────────────────────────────────

    // Send emails in parallel, non-blocking
    await Promise.allSettled([
      // Confirmation to subscriber
      resend.emails.send({
        from: "OutsYde <hello@goutsyde.com>",
        to: email,
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
        from: "OutsYde Waitlist <hello@goutsyde.com>",
        to: "hello@goutsyde.com",
        subject: `New waitlist signup — ${vendorName}`,
        html: `
          <p><strong>Vendor:</strong> ${vendorName} (${vendor})</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        `,
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waitlist] POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}