import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";

/**
 * Shared helpers for the /api/events BFF routes. Each route validates its path params, then hands
 * the request to proxyToBackend (status preserved, never throws, no-store on the backend fetch).
 * Route handlers that read the request or headers are dynamic in Next 16, so nothing is cached.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9-]{1,80}$/;

export const isUuid = (v: string): boolean => UUID_RE.test(v);

/** Lowercased slug if valid, else null (the backend lowercases slugs too). */
export function cleanSlug(v: string): string | null {
  const s = v.toLowerCase();
  return SLUG_RE.test(s) ? s : null;
}

/** Own errors use the same flat shape proxyToBackend relays: { success:false, error:"<message>", code:"<CODE>" }. */
export function notFound(): NextResponse {
  return NextResponse.json({ success: false, error: "Not found.", code: "NOT_FOUND" }, { status: 404 });
}

export function badRequest(code: string, message: string): NextResponse {
  return NextResponse.json({ success: false, error: message, code }, { status: 400 });
}

/** Forward with the caller's Bearer token and Cookie (no body). */
export function forward(req: NextRequest, method: "GET" | "POST", path: string, body?: unknown): Promise<NextResponse> {
  return proxyToBackend(path, { method, headers: backendAuthHeaders(req) as Record<string, string>, body });
}

/** Parse the client's JSON object body; null when it is missing, invalid or not an object. */
export async function readJsonObject(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await req.json();
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const invalidBody = () => badRequest("INVALID_JSON", "Request body must be a JSON object.");
