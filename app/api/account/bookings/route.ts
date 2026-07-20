import { NextRequest, NextResponse } from "next/server";

function getToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") || "";
  return cookie.match(/outsyde_access_token=([^;]+)/)?.[1] ?? null;
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [apptRes, shootRes] = await Promise.all([
    fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/my-appointments`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/my-shoot-bookings`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const [apptData, shootData] = await Promise.all([apptRes.json(), shootRes.json()]);

  const appointments = (apptData.appointments || apptData || []).map((a: any) => ({
    ...a,
    _type: "appointment",
  }));
  const shoots = (shootData.bookings || shootData || []).map((s: any) => ({
    ...s,
    _type: "shoot",
  }));

  const combined = [...appointments, ...shoots].sort(
    (a, b) =>
      new Date(b.scheduledAt || b.date || 0).getTime() -
      new Date(a.scheduledAt || a.date || 0).getTime()
  );

  return NextResponse.json({ bookings: combined });
}