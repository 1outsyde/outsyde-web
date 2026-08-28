import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.OUTSYDE_BACKEND_URL!;

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/outsyde_access_token=([^;]+)/);
  return match ? match[1] : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  try {
    const token = getAccessToken(req);
    const headers: Record<string, string> = {
      cookie: req.headers.get("cookie") ?? "",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(
      `${BACKEND}/api/bookings/photographer/${bookingId}/accept`,
      { method: "POST", headers }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[photographer/me/bookings/accept] proxy error:", err);
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}
