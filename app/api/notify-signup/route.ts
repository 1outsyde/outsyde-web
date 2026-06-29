// app/api/notify-signup/route.ts
// Receives a notify-list email from the Coming Soon page and sends:
//   1) an internal alert to info@goutsyde.com
//   2) a branded confirmation to the person who signed up
// Both go through Resend (reuses lib/emails.ts — same verified from-address).
//
// WHERE THIS GOES:  outsyde-web/app/api/notify-signup/route.ts
// Needs (already in Vercel):  RESEND_API_KEY

import { NextResponse } from "next/server";
import { sendNotifySignupAlert, sendNotifySignupConfirmation } from "@/lib/emails";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const clean = email.trim().toLowerCase();

    // Internal alert is the one that must succeed (it's how YOU learn about the lead).
    const alertOk = await sendNotifySignupAlert({ email: clean });

    // Confirmation to the signer is best-effort — a bad/typo'd address shouldn't
    // make the whole signup look broken to the user.
    await sendNotifySignupConfirmation({ email: clean });

    if (!alertOk) {
      return NextResponse.json({ error: "Could not record signup. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}