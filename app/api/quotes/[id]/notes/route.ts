import { NextRequest, NextResponse } from "next/server";
import { badRequest, forward, invalidBody, isUuid, notFound, quoteFor, readBody } from "../../_lib/bff";
import { backendAuthHeaders } from "@/lib/admin-auth";
import { readJsonSafe } from "@/lib/read-json-safe";

/**
 * Notes on the quote page: the quote's own chat, the same conversation as app Messages (step 5 call 3; the backend
 * emails unread notes). The chat comes from the quote the caller may read, never from the browser.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const q = await quoteFor(req, id);
  if (!q.ok) return q.res;
  try {
    const r = await fetch(`${process.env.OUTSYDE_BACKEND_URL}/api/conversations/${q.quote.conversationId}/messages?limit=100`, { headers: backendAuthHeaders(req) as Record<string, string>, cache: "no-store" });
    const { status, data } = await readJsonSafe(r);
    if (status !== 200) return NextResponse.json(data, { status });
    const list = Array.isArray((data as { messages?: unknown[] })?.messages) ? (data as { messages: Record<string, unknown>[] }).messages : [];
    const messages = list.map((m) => ({
      id: m.id, senderId: m.senderId, content: typeof m.content === "string" ? m.content : "", kind: m.kind ?? "text",
      mediaItems: Array.isArray(m.mediaItems) ? m.mediaItems : [], createdAt: m.createdAt,
    }));
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: "Could not reach server." }, { status: 502 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await readBody(req);
  if (!body) return invalidBody();
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return badRequest("EMPTY", "Write a note first.");
  if (content.length > 2000) return badRequest("TOO_LONG", "Keep notes to 2,000 characters.");
  const q = await quoteFor(req, id);
  if (!q.ok) return q.res;
  return forward(req, "POST", `/api/conversations/${q.quote.conversationId}/messages`, { content });
}
