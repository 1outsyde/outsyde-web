import { NextRequest, NextResponse } from "next/server";

function getToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") || "";
  return cookie.match(/outsyde_access_token=([^;]+)/)?.[1] ?? null;
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookie = req.headers.get("cookie") || "";

  const res = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/my-appointments`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Cookie: cookie,
    },
  });

  if (!res.ok) {
    return NextResponse.json({ bookings: [] }, { status: 200 });
  }

  const data = await res.json();
  const appointments = (data.appointments || data || []).map((a: any) => ({
    ...a,
    _type: "appointment",
  }));

  const sorted = appointments.sort(
    (a: any, b: any) =>
      new Date(b.scheduledAt || b.date || b.startTime || 0).getTime() -
      new Date(a.scheduledAt || a.date || a.startTime || 0).getTime()
  );

  return NextResponse.json({ bookings: sorted });
}