// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { sendContactInquiry } from "@/lib/emails";

export async function POST(req: Request) {
  let body: { name?: unknown; email?: unknown; inquiryType?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, inquiryType, message } = body;

  if (typeof name !== "string" || !name.trim())
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (typeof email !== "string" || !email.includes("@"))
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (typeof inquiryType !== "string" || !inquiryType.trim())
    return NextResponse.json({ error: "Inquiry type is required." }, { status: 400 });
  if (typeof message !== "string" || !message.trim())
    return NextResponse.json({ error: "Message is required." }, { status: 400 });

  try {
    await sendContactInquiry({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      inquiryType: inquiryType.trim(),
      message: message.trim(),
    });
  } catch (err) {
    console.error("contact: email failed", err);
    return NextResponse.json({ error: "Couldn't send your message. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}