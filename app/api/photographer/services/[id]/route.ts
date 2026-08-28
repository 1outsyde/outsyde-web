import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.OUTSYDE_BACKEND_URL!;

function getAccessToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/outsyde_access_token=([^;]+)/);
  return match ? match[1] : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = getAccessToken(req);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const body = await req.json();
    const backendRes = await fetch(`${BACKEND}/api/photographers/me/services/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = getAccessToken(req);
    const headers: Record<string, string> = {
      cookie: req.headers.get("cookie") ?? "",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const backendRes = await fetch(`${BACKEND}/api/photographers/me/services/${id}`, {
      method: "DELETE",
      headers,
    });
    if (backendRes.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}
