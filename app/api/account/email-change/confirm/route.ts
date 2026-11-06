// BFF: POST { code } confirms the change and moves the account email. See lib/change-email-bff.ts.
import { NextRequest, NextResponse } from "next/server";
import { pickBody, proxyEmailChange } from "@/lib/change-email-bff";

export async function POST(req: NextRequest) {
  const body = await pickBody(req, ["code"]);
  if (!body || !body.code) {
    return NextResponse.json({ success: false, error: { code: "INVALID_CODE", message: "Enter the 6 digit code." } }, { status: 400 });
  }
  return proxyEmailChange(req, "POST", "/confirm", body);
}
