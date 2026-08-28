// app/api/waitlist/route.ts
// Vendor coming-soon waitlist signups.
// Delegates all email sending to lib/emails.ts — same pattern as notify-signup/route.ts.
// lib/emails.ts owns the Resend client, the verified FROM_ADDRESS, and the templates.

import { NextRequest, NextResponse } from "next/server";
import { sendNotifySignupAlert, sendNotifySignupConfirmation } from "@/lib/emails";

const VENDOR_NAMES: Record<string, string> = {
  "xo-beauty": "XO Beauty & Lashes",
  "braids-with-love": "Braids With Love",
};

export async function POST(req: NextRequest) {
  let body: { email?: unknown; vendor?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, vendor } = body;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanVendor = typeof vendor === "string" ? vendor.trim() : "";
  const vendorName = VENDOR_NAMES[cleanVendor] ?? cleanVendor;

  try {
    await sendNotifySignupAlert({ email: cleanEmail, vendorName });
  } catch (err) {
    console.error("[waitlist] alert email failed:", err);
  }

  try {
    await sendNotifySignupConfirmation({ email: cleanEmail, vendorName });
  } catch (err) {
    console.error("[waitlist] confirmation email failed:", err);
  }

  return NextResponse.json({ success: true });
}
