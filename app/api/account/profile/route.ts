import { NextRequest, NextResponse } from "next/server";

function getToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") || "";
  return cookie.match(/outsyde_access_token=([^;]+)/)?.[1] ?? null;
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // First get userId from auth/me
  const meRes = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await meRes.json();
  if (!me.authenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Then get full public profile with followerCount, followingCount, city, state etc.
  const [profileRes, pointsRes] = await Promise.all([
    fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/users/${me.userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/points/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const profileData = await profileRes.json();
  const pointsData = pointsRes.ok ? await pointsRes.json() : { balance: 0 };

  const user = profileData.user || profileData;

  return NextResponse.json({
    ...user,
    email: me.email,
    loyaltyPoints: pointsData.balance ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const res = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/users/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}