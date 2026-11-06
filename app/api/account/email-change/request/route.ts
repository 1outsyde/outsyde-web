// BFF: POST { newEmail, password? } sends a 6 digit code to the new address. See lib/change-email-bff.ts.
import { NextRequest, NextResponse } from "next/server";
import { pickBody, proxyEmailChange } from "@/lib/change-email-bff";

export async function POST(req: NextRequest) {
  const body = await pickBody(req, ["newEmail", "password"]);
  if (!body || !body.newEmail) {
    return NextResponse.json({ success: false, error: { code: "INVALID_EMAIL", message: "Enter a valid email address." } }, { status: 400 });
  }
  return proxyEmailChange(req, "POST", "/request", body);
}
