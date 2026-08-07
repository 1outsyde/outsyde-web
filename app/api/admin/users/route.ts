import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeaders } from "@/lib/admin-auth";

// The backend reads type, search, limit, offset. `type` is recognised ONLY as
// customers|vendors|photographers — any other value falls through its if/else
// chain unfiltered and returns every user. So "all" is sent as an omitted
// param rather than type=all: same result today, but by design rather than by
// accident, and it stays correct if the backend ever validates the value.
const RECOGNISED_TYPES = new Set(["customers", "vendors", "photographers"]);

export async function GET(req: NextRequest) {
  const incoming = req.nextUrl.searchParams;
  const params = new URLSearchParams();

  const type = incoming.get("type");
  if (type && RECOGNISED_TYPES.has(type)) {
    params.set("type", type);
  }

  const search = incoming.get("search");
  if (search && search.trim() !== "") {
    params.set("search", search.trim());
  }

  params.set("limit", incoming.get("limit") || "50");
  params.set("offset", incoming.get("offset") || "0");

  const res = await fetch(
    `${process.env.OUTSYDE_BACKEND_URL}/api/admin/users?${params.toString()}`,
    { headers: backendAuthHeaders(req) }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
