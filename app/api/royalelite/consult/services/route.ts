// BFF: Royal Elite free-consultation services (public).
//   GET → { available, services: [{ id, name, description, durationMinutes, serviceLocationType,
//           imageUrl, bookingQuestions }] }
// Backend 404 (business hidden) → 200 { available: false, services: [] }.

import { NextResponse } from "next/server";
import { fetchFreeServices } from "@/lib/royal-elite-consult";

export async function GET() {
  const result = await fetchFreeServices();
  if (!result.ok) {
    return NextResponse.json({ available: false, services: [], error: result.data.error ?? "Could not load services." }, { status: result.status });
  }
  return NextResponse.json({ available: result.available, services: result.services });
}
