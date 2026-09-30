import { NextResponse } from "next/server";
import { readJsonSafe } from "@/lib/read-json-safe";

/**
 * Forward one request to outsyde-backend and relay its JSON (status preserved).
 * Never throws: a missing config, an unreachable backend or an unreadable body all become a
 * JSON { error } response. Nothing from the request is logged (claim tokens travel in bodies).
 */
export async function proxyToBackend(
  path: string,
  init: { method: string; headers: Record<string, string>; body?: unknown },
): Promise<NextResponse> {
  const backendUrl = process.env.OUTSYDE_BACKEND_URL;
  if (!backendUrl) {
    console.error("OUTSYDE_BACKEND_URL is not set");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const res = await fetch(`${backendUrl}${path}`, {
      method: init.method,
      headers: init.body !== undefined ? { ...init.headers, "Content-Type": "application/json" } : init.headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    const { status, data } = await readJsonSafe(res);
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json({ error: "Could not reach server." }, { status: 502 });
  }
}
