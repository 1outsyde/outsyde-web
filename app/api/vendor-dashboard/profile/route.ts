import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.OUTSYDE_BACKEND_URL!;

export async function GET(req: NextRequest) {
  try {
    const backendRes = await fetch(`${BACKEND}/api/vendor/my-business`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}