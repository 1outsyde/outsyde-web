import { NextRequest } from "next/server";
import { forward, invalidBody, readJsonObject } from "./_lib/bff";

/** The only query keys the public list accepts; anything else is dropped before the backend sees it. */
const LIST_KEYS = ["lat", "lng", "radiusKm", "city", "from", "to", "free", "limit", "cursor"] as const;

export async function GET(req: NextRequest) {
  const query = new URLSearchParams();
  for (const key of LIST_KEYS) {
    const value = req.nextUrl.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  return forward(req, "GET", "/api/events", undefined, query);
}

export async function POST(req: NextRequest) {
  const body = await readJsonObject(req);
  if (!body) return invalidBody();
  return forward(req, "POST", "/api/events", body);
}
