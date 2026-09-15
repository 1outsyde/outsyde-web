import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(
      `${process.env.OUTSYDE_BACKEND_URL}/api/admin/subscription/grant-link`,
      {
        method: "POST",
        headers: {
          ...backendAuthHeaders(req),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to generate grant link" }, { status: 500 });
  }
}
