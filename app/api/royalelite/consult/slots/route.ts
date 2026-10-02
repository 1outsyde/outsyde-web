// BFF: open times for a Royal Elite free consultation (public).
//   GET ?serviceId&date=YYYY-MM-DD → { date, slots: [{ startTime, endTime }] } (HH:MM, 24h)
// The service must be one of Royal Elite's free services; the duration comes from that service,
// never from the client.

import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { ROYAL_ELITE_BUSINESS_ID } from "@/lib/royal-elite";
import { fetchFreeServices, isIsoDate } from "@/lib/royal-elite-consult";

export async function GET(req: NextRequest) {
  const serviceId = req.nextUrl.searchParams.get("serviceId");
  const date = req.nextUrl.searchParams.get("date");
  if (!serviceId) {
    return NextResponse.json({ error: "serviceId is required.", code: "INVALID_REQUEST" }, { status: 400 });
  }
  if (!isIsoDate(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD.", code: "INVALID_DATE" }, { status: 400 });
  }

  const free = await fetchFreeServices();
  if (!free.ok) return NextResponse.json(free.data, { status: free.status });
  const service = free.services.find((s) => s.id === serviceId);
  if (!service) {
    return NextResponse.json({ error: "This consultation is not available.", code: "SERVICE_NOT_AVAILABLE" }, { status: 404 });
  }

  const qs = new URLSearchParams({
    providerType: "business",
    providerId: ROYAL_ELITE_BUSINESS_ID,
    date,
    serviceDurationMinutes: String(service.durationMinutes),
  });
  const res = await proxyToBackend(`/api/availability/slots?${qs.toString()}`, { method: "GET", headers: {} });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const slots = (Array.isArray(data.slots) ? (data.slots as Record<string, unknown>[]) : [])
    .filter((s) => s && s.available === true && typeof s.startTime === "string")
    .map((s) => ({ startTime: s.startTime as string, endTime: typeof s.endTime === "string" ? s.endTime : null }));
  return NextResponse.json({ date, slots });
}
