// BFF: book a Royal Elite free consultation.
//   POST { serviceId, date, startTime, answers, address? }
//   → backend POST /api/booking/hold, then POST /api/booking/:holdId/confirm-free
//   → 200 { free, appointmentId, bookingNumber, status: "confirmed" | "pending_provider" }
//
// Auth: outsyde_access_token cookie → Authorization: Bearer + raw cookie (as
// app/api/account/bookings/route.ts). No cookie → 401 { code: "SIGN_IN_REQUIRED" }.
// providerType/providerId are pinned server-side. The service must be one of Royal Elite's free
// services. Customer-location services need a valid address, checked before any hold exists.
// When confirm-free answers 4xx the hold is released; after a 200 it is never touched.
// Backend status and code/message/errors are passed through; `stage` says which call failed.

import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { ROYAL_ELITE_BUSINESS_ID } from "@/lib/royal-elite";
import {
  authHeaders,
  fetchFreeServices,
  isHhMm,
  isIsoDate,
  validateServiceAddress,
  type CustomerAddressFields,
} from "@/lib/royal-elite-consult";

export async function POST(req: NextRequest) {
  const { token, headers } = authHeaders(req);
  if (!token) {
    return NextResponse.json({ error: "Sign in to book.", code: "SIGN_IN_REQUIRED" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "Invalid request body.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const { serviceId, date, startTime } = body;
  if (typeof serviceId !== "string" || !serviceId) {
    return NextResponse.json({ error: "serviceId is required.", code: "INVALID_REQUEST" }, { status: 400 });
  }
  if (!isIsoDate(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD.", code: "INVALID_DATE" }, { status: 400 });
  }
  if (!isHhMm(startTime)) {
    return NextResponse.json({ error: "startTime must be HH:MM.", code: "INVALID_TIME" }, { status: 400 });
  }

  const free = await fetchFreeServices();
  if (!free.ok) return NextResponse.json(free.data, { status: free.status });
  const service = free.services.find((s) => s.id === serviceId);
  if (!service) {
    return NextResponse.json({ error: "This consultation is not available.", code: "SERVICE_NOT_AVAILABLE" }, { status: 404 });
  }

  let address: Partial<CustomerAddressFields> = {};
  if (service.serviceLocationType === "customer") {
    const check = validateServiceAddress(body.address);
    if (!check.ok) {
      return NextResponse.json(
        { error: "Please check the service address.", code: "INVALID_ADDRESS", errors: check.errors },
        { status: 400 },
      );
    }
    address = check.fields;
  }

  // Only { questionId, answer } pairs go upstream; the backend validates the answers.
  const answers = (Array.isArray(body.answers) ? body.answers : [])
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a) => ({ questionId: a.questionId, answer: a.answer }));

  const holdRes = await proxyToBackend("/api/booking/hold", {
    method: "POST",
    headers,
    body: { providerType: "business", providerId: ROYAL_ELITE_BUSINESS_ID, serviceId, date, startTime },
  });
  const holdData = (await holdRes.json().catch(() => ({}))) as Record<string, unknown>;
  const holdId = typeof holdData.holdId === "string" ? holdData.holdId : null;
  if (!holdRes.ok || !holdId) {
    return NextResponse.json({ ...holdData, stage: "hold" }, { status: holdRes.ok ? 502 : holdRes.status });
  }

  const confirmRes = await proxyToBackend(`/api/booking/${encodeURIComponent(holdId)}/confirm-free`, {
    method: "POST",
    headers,
    body: { answers, ...address },
  });
  const confirmData = (await confirmRes.json().catch(() => ({}))) as Record<string, unknown>;

  if (confirmRes.ok) {
    return NextResponse.json({
      free: confirmData.free,
      appointmentId: confirmData.appointmentId,
      bookingNumber: confirmData.bookingNumber,
      status: confirmData.status,
    });
  }

  // 4xx: nothing was booked for this hold, so give the slot back. 5xx: the outcome is unknown
  // (the appointment may exist), so the hold is left for the backend to settle or expire.
  if (confirmRes.status >= 400 && confirmRes.status < 500) {
    await proxyToBackend(`/api/booking/hold/${encodeURIComponent(holdId)}`, { method: "DELETE", headers });
  }
  return NextResponse.json({ ...confirmData, stage: "confirm" }, { status: confirmRes.status });
}
