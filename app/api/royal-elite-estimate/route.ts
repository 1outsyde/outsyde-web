// app/api/royal-elite-estimate/route.ts
// Receives a move-request / free-estimate submission from the Royal Elite
// storefront (app/shop/royalelite/page.tsx) and emails the lead to BOTH:
//   1) info@goutsyde.com               (you — every lead logged in the Outsyde inbox)
//   2) Bprovisionproperties@yahoo.com  (Royal Elite — so the vendor can act on it)
//
// Uses lib/emails.ts sendEmail() helper — same fetch-based Resend pattern as
// notify-signup and Lotus. No SDK import, no new dependency.
//
// WHERE THIS GOES:  outsyde-web/app/api/royal-elite-estimate/route.ts
// Needs (already in Vercel):  RESEND_API_KEY

import { NextResponse } from "next/server";
import { sendRoyalEliteEstimate } from "@/lib/emails";

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

    const ok = await sendRoyalEliteEstimate({
      name:        esc(d.name),
      email:       d.email.trim(),
      phone:       esc(d.phone),
      moveDate:    esc(d.moveDate),
      moveType:    esc(d.moveType),
      homeSize:    esc(d.homeSize),
      fromAddress: esc(d.fromAddress),
      toAddress:   esc(d.toAddress),
      floor:       esc(d.floor),
      stops:       esc(d.stops),
      notes:       esc(d.notes),
    });

    if (!ok) {
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