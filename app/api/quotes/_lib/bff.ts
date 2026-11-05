import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";
import { proxyToBackend } from "@/lib/backend-proxy";
import { readJsonSafe } from "@/lib/read-json-safe";

/**
 * Shared helpers for the /api/quotes BFF routes (Quotes step 5b). Same pattern as /api/events: validate the path
 * params, forward with the caller's token and cookie, relay the backend's status and JSON. Only fields a route
 * names are forwarded.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_RE = /^[A-Za-z0-9_-]{8,64}$/;
export const isUuid = (v: string): boolean => UUID_RE.test(v);
export const isLinkCode = (v: string): boolean => CODE_RE.test(v);

export const notFound = () => NextResponse.json({ error: "Not found.", code: "NOT_FOUND" }, { status: 404 });
export const badRequest = (code: string, message: string) => NextResponse.json({ error: message, code }, { status: 400 });

export function forward(req: NextRequest, method: "GET" | "POST", path: string, body?: unknown): Promise<NextResponse> {
  return proxyToBackend(path, { method, headers: backendAuthHeaders(req) as Record<string, string>, body });
}

/** The JSON object body, {} when empty, null when it isn't an object. */
export async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  let text = "";
  try { text = await req.text(); } catch { return null; }
  if (!text.trim()) return {};
  try {
    const v: unknown = JSON.parse(text);
    return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
export const invalidBody = () => badRequest("INVALID_JSON", "Request body must be a JSON object.");

/** Reads the quote the caller may see (the backend checks who). Returns the backend answer when it isn't 200. */
export async function quoteFor(req: NextRequest, id: string): Promise<{ ok: true; quote: { conversationId: string; customerId: string } } | { ok: false; res: NextResponse }> {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) return { ok: false, res: NextResponse.json({ error: "Server configuration error." }, { status: 500 }) };
  try {
    const r = await fetch(`${backendUrl}/api/quotes/${id}`, { headers: backendAuthHeaders(req) as Record<string, string>, cache: "no-store" });
    const { status, data } = await readJsonSafe(r);
    const q = (data as { quote?: { conversationId?: unknown; customerId?: unknown } } | null)?.quote;
    if (status !== 200 || typeof q?.conversationId !== "string") return { ok: false, res: NextResponse.json(data, { status }) };
    return { ok: true, quote: { conversationId: q.conversationId, customerId: String(q.customerId ?? "") } };
  } catch {
    return { ok: false, res: NextResponse.json({ error: "Could not reach server." }, { status: 502 }) };
  }
}
