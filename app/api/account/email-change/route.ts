// BFF: GET (the open request + passwordRequired) and DELETE (cancel) for change email. See lib/change-email-bff.ts.
import { NextRequest } from "next/server";
import { proxyEmailChange } from "@/lib/change-email-bff";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return proxyEmailChange(req, "GET", "");
}

export async function DELETE(req: NextRequest) {
  return proxyEmailChange(req, "DELETE", "");
}
