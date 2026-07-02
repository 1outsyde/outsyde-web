// app/api/omega-consultation/route.ts
// Receives the free-consultation booking form from the Omega storefront
// (app/shop/omega/page.tsx) and emails the lead via Resend, same pattern
// as app/api/royal-elite-estimate/route.ts.
//
// WHERE THIS GOES:  outsyde-web/app/api/omega-consultation/route.ts
// Needs (already in Vercel):  RESEND_API_KEY

import { NextResponse } from "next/server";
import { sendOmegaConsultation, sendOmegaConsultationConfirmation } from "@/lib/emails";

function esc(s?: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const d = await req.json();
    if (!d.email || typeof d.email !== "string" || !d.email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const name = esc(d.name);
    const email = d.email.trim();
    const preferredDate = esc(d.preferredDate);
    const preferredTime = esc(d.preferredTime);

    // Internal notification (info@goutsyde.com + Omega, once OMEGA_VENDOR_EMAIL is set)
    const ok = await sendOmegaConsultation({
      name,
      email,
      phone: esc(d.phone),
      preferredDate,
      preferredTime,
      goals: esc(d.goals),
      heardAbout: esc(d.heardAbout),
    });

    if (!ok) {
      return NextResponse.json(
        { error: "Could not send your request. Please try again or reach out directly." },
        { status: 502 }
      );
    }

    // Customer-facing confirmation. Fired after the internal email succeeds;
    // if this one fails, we don't fail the whole request — the lead is
    // already captured internally either way.
    await sendOmegaConsultationConfirmation({ name, email, preferredDate, preferredTime });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}