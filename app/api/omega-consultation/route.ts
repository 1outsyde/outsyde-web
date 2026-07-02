// app/api/omega-consultation/route.ts
// Receives the free-consultation booking form from the Omega storefront
// (app/shop/omega/page.tsx) and emails the lead via Resend, same pattern
// as app/api/royal-elite-estimate/route.ts.
//
// WHERE THIS GOES:  outsyde-web/app/api/omega-consultation/route.ts
// Needs (already in Vercel):  RESEND_API_KEY

import { NextResponse } from "next/server";
import { sendOmegaConsultation } from "@/lib/emails";

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

    const ok = await sendOmegaConsultation({
      name: esc(d.name),
      email: d.email.trim(),
      phone: esc(d.phone),
      preferredDate: esc(d.preferredDate),
      preferredTime: esc(d.preferredTime),
      goals: esc(d.goals),
      heardAbout: esc(d.heardAbout),
    });

    if (!ok) {
      return NextResponse.json(
        { error: "Could not send your request. Please try again or reach out directly." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}