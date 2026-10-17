import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/admin-auth";

const BACKEND = process.env.OUTSYDE_BACKEND_URL!;

// POST /api/media/video-upload-url → backend POST /api/media/video-upload-url
// Returns { uploadUrl, uploadId }. The browser then PUTs the file straight to
// Mux (uploadUrl) and saves uploadId as the cover with coverMediaType "video";
// the backend swaps it for the playable URL when Mux finishes processing.
export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const backendRes = await fetch(`${BACKEND}/api/media/video-upload-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: req.headers.get("cookie") ?? "",
        "Content-Type": "application/json",
      },
    });
    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to create video upload" }, { status: 500 });
  }
}
