import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

const BACKEND = process.env.OUTSYDE_BACKEND_URL!;

export async function GET(req: NextRequest) {
  try {
    const backendRes = await fetch(`${BACKEND}/api/vendor/my-business`, {
      headers: backendAuthHeaders(req),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const backendRes = await fetch(`${BACKEND}/api/vendor/my-business`, {
      method: "PATCH",
      headers: {
        ...backendAuthHeaders(req),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}