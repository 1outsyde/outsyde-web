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

export type ForwardMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Forward with the caller's Bearer token and Cookie. An optional query (a string such as "scope=event" or
 * a URLSearchParams) is appended to the path; callers pass only keys they have already validated.
 * Optional extra headers are added on top (a route opts in to each one, e.g. the accept route's User-Agent).
 */
export function forward(
  req: NextRequest,
  method: ForwardMethod,
  path: string,
  body?: unknown,
  query?: string | URLSearchParams,
  extraHeaders?: Record<string, string>,
): Promise<NextResponse> {
  const qs = query === undefined ? "" : query.toString();
  const headers = { ...(extraHeaders ?? {}), ...(backendAuthHeaders(req) as Record<string, string>) };
  return proxyToBackend(qs ? `${path}?${qs}` : path, { method, headers, body });
}

/** p4-team step 8: the Event team roles the backend accepts (doorRouter roleSchema). */
export const TEAM_ROLES = new Set(["door", "security", "host", "entertainment", "media", "cohost", "other"]);

/** ?roles=all passes through when the caller sent exactly that; anything else is dropped (the backend default). */
export function rolesAll(req: NextRequest): URLSearchParams | undefined {
  return req.nextUrl.searchParams.get("roles") === "all" ? new URLSearchParams({ roles: "all" }) : undefined;
}

/** ?role= for a per role route: a known role, else null (answer 400). */
export function roleParam(req: NextRequest): string | null {
  const r = req.nextUrl.searchParams.get("role") ?? "";
  return TEAM_ROLES.has(r) ? r : null;
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

/**
 * Like readJsonObject, for routes whose body is optional: an empty body gives undefined (forward nothing),
 * a JSON object gives the object, anything else gives null (answer with invalidBody()).
 */
export async function readOptionalJsonObject(req: NextRequest): Promise<Record<string, unknown> | undefined | null> {
  let text: string;
  try {
    text = await req.text();
  } catch {
    return null;
  }
  if (text.trim() === "") return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const invalidBody = () => badRequest("INVALID_JSON", "Request body must be a JSON object.");
