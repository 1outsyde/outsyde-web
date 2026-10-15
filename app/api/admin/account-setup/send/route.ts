import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

// POST /api/admin/account-setup/send { userIds: string[] } → real send to those people only.
//
// userIds is REQUIRED here on purpose: without it the backend emails everyone who is due,
// and this page must only ever email the people ticked. Backend re-validates (1–200 ids)
// and still skips anyone not due (already emailed, finished, opted out) → `notDue`.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const userIds = body?.userIds;
  if (
    !Array.isArray(userIds) ||
    userIds.length === 0 ||
    !userIds.every((v: unknown) => typeof v === "string" && v.length > 0)
  ) {
    return NextResponse.json({ error: "Pick at least one person" }, { status: 400 });
  }
  try {
    const res = await fetch(
      `${process.env.OUTSYDE_BACKEND_URL}/api/admin/account-setup/send`,
      {
        method: "POST",
        headers: { ...backendAuthHeaders(req), "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false, userIds }),
        cache: "no-store",
      }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    // The request may have reached the backend; the page reloads the list before any retry.
    return NextResponse.json(
      { error: "Couldn't reach the server. Some emails may have gone out — reload the list before sending again." },
      { status: 502 }
    );
  }
}
