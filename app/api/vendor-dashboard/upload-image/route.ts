import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/admin-auth";

const BACKEND = process.env.OUTSYDE_BACKEND_URL!;

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const backendRes = await fetch(`${BACKEND}/api/media/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: req.headers.get("cookie") ?? "",
      },
      body: formData,
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
