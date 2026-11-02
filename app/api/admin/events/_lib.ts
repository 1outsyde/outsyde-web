// Shared bits for the admin events money BFF routes. Real authorization is the backend's
// requirePlatformAdmin; these routes only check a token exists, validate ids and forward.
// Kept separate from app/api/events/_lib (the host facing BFF).

import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders, getTokenFromRequest } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

// The backend's own id rule.
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

export const isValidId = (id: string): boolean => ID_RE.test(id);

export const notSignedIn = () => NextResponse.json({ error: "Not signed in." }, { status: 401 });
export const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404 });

/** 401 when signed out, 404 when an id is malformed, otherwise forward and relay the status. */
export async function forwardAdmin(
  req: NextRequest,
  opts: { method: "GET" | "POST"; path: (ids: string[]) => string; ids?: string[]; body?: unknown },
): Promise<NextResponse> {
  if (!getTokenFromRequest(req)) return notSignedIn();
  const ids = opts.ids ?? [];
  if (!ids.every(isValidId)) return notFound();
  return proxyToBackend(opts.path(ids), {
    method: opts.method,
    headers: backendAuthHeaders(req) as Record<string, string>,
    body: opts.body,
  });
}

/** Parse the client's JSON body; null when missing, invalid or not an object. */
export async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const v: unknown = await req.json();
    return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const badBody = (message: string) => NextResponse.json({ error: message, code: "INVALID_BODY" }, { status: 400 });

/** p5-safety: the admin's reason, 1 to 500 characters after trimming; null when it isn't one. */
export function cleanReason(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length >= 1 && t.length <= 500 ? t : null;
}

/**
 * p5-safety moderation action on one event (pause, release, cancel, reports/dismiss): 401 signed out, 404 bad id,
 * 400 without a reason; only { reason } is forwarded. The backend checks platform admin and the event's state.
 */
export async function forwardEventModeration(req: NextRequest, id: string, action: "pause" | "release" | "cancel" | "reports/dismiss"): Promise<NextResponse> {
  if (!getTokenFromRequest(req)) return notSignedIn();
  if (!isValidId(id)) return notFound();
  const reason = cleanReason((await readBody(req))?.reason);
  if (!reason) return badBody("Add a reason (up to 500 characters).");
  return forwardAdmin(req, {
    method: "POST",
    ids: [id],
    path: ([i]) => `/api/admin/events/${encodeURIComponent(i)}/${action}`,
    body: { reason },
  });
}
