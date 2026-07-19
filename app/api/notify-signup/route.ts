// app/api/notify-signup/route.ts
import { NextResponse } from "next/server";
import { sendNotifySignupAlert, sendNotifySignupConfirmation } from "@/lib/emails";

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

  try {
    await sendNotifySignupAlert({ email: cleanEmail });
  } catch (err) {
    console.error("notify-signup: alert email failed", err);
  }

  try {
    await sendNotifySignupConfirmation({ email: cleanEmail });
  } catch (err) {
    console.error("notify-signup: confirmation email failed", err);
  }

  return NextResponse.json({ success: true });
}