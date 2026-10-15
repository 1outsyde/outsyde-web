import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

// GET /api/admin/account-setup/preview → backend dry run (writes nothing).
// Backend: { success, count, reminders: [{ userId, email, displayName, role,
//   reminderNumber, template: "claim" | "steps_left", steps, channels, outcome }] }
// Only accounts with a reminder due right now are listed.
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(
      `${process.env.OUTSYDE_BACKEND_URL}/api/admin/account-setup/preview`,
      { headers: backendAuthHeaders(req), cache: "no-store" }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Couldn't reach the server" }, { status: 502 });
  }
}
