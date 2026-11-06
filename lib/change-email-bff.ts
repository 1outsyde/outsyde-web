// Server only. Shared proxy for the change email BFF routes (/api/account/email-change/*), backend #426 + #428.
// Reads the outsyde_access_token cookie like every other account BFF route and forwards it as a Bearer token.
// The backend's status and body (its own { error: { code, message } }) pass through unchanged, so the page
// shows the backend's wording. Only the fields each backend route accepts are forwarded.

import { NextRequest, NextResponse } from "next/server";

function getToken(req: NextRequest): string | null {
  const cookie = req.headers.get("cookie") || "";
  return cookie.match(/outsyde_access_token=([^;]+)/)?.[1] ?? null;
}

const fail = (status: number, code: string, message: string) =>
  NextResponse.json({ success: false, error: { code, message } }, { status });

/** Picks the allowed string fields from a JSON body; anything else is dropped. */
export async function pickBody(req: NextRequest, keys: string[]): Promise<Record<string, string> | null> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === "string" && v.length <= 400) out[k] = v;
  }
  return out;
}

export async function proxyEmailChange(
  req: NextRequest,
  method: "GET" | "POST" | "DELETE",
  path: "" | "/request" | "/confirm",
  body?: Record<string, string>,
): Promise<NextResponse> {
  const token = getToken(req);
  if (!token) return fail(401, "AUTH_REQUIRED", "Please sign in.");

  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) return fail(500, "SERVER_ERROR", "Something went wrong. Please try again.");

  let res: Response;
  try {
    res = await fetch(`${backendUrl}/api/auth/email-change${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    return fail(502, "SERVER_ERROR", "We couldn't reach Outsyde. Please try again.");
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non JSON from upstream (an older backend without these routes returns HTML 404).
  }
  if (!data || typeof data !== "object") {
    return fail(res.ok ? 502 : res.status, "SERVER_ERROR", "Something went wrong. Please try again.");
  }
  return NextResponse.json(data, { status: res.status, headers: { "Cache-Control": "no-store" } });
}
