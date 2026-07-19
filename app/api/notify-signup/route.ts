// app/api/notify-signup/route.ts
// Captures email-only waitlist signups from /coming-soon.
// Sends an internal alert to info@goutsyde.com + confirmation to the signer.

import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email } = body;

  if (typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Internal alert
  try {
    await resend.emails.send({
      from: "OutsYde <no-reply@goutsyde.com>",
      to: "info@goutsyde.com",
      subject: `New Waitlist Signup — ${cleanEmail}`,
      html: `<p>A new visitor joined the waitlist:</p><p><strong>${cleanEmail}</strong></p>`,
    });
  } catch (err) {
    console.error("notify-signup: alert email failed", err);
  }

  // Confirmation to the user
  try {
    await resend.emails.send({
      from: "OutsYde <no-reply@goutsyde.com>",
      to: cleanEmail,
      subject: "You're on the Outsyde list 🖤",
      html: `
        <p>Thanks for signing up.</p>
        <p>We're putting the finishing touches on OutsYde and we'll email you the moment this goes live.</p>
        <p>— The OutsYde Team</p>
      `,
    });
  } catch (err) {
    console.error("notify-signup: confirmation email failed", err);
  }

  return NextResponse.json({ success: true });
}