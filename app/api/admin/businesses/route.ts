import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";
import { readJsonSafe } from "@/lib/read-json-safe";

export async function GET(req: NextRequest) {
  const incoming = req.nextUrl.searchParams;
  const params = new URLSearchParams();

  const search = incoming.get("search");
  if (search && search.trim()) params.set("search", search.trim());

  params.set("limit", incoming.get("limit") || "100");
  params.set("offset", incoming.get("offset") || "0");

  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/businesses?${params.toString()}`,
    { headers: backendAuthHeaders(req) }
  );
  const { status, data } = await readJsonSafe(res);
  return NextResponse.json(data, { status });
}
