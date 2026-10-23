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
