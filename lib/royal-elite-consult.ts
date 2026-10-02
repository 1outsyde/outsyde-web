// Server helpers for the Royal Elite free-consultation BFFs (app/api/royalelite/consult/*).
// The business is pinned here: no route ever takes a providerType or providerId from the client.

import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";
import { getTokenFromRequest } from "@/lib/admin-auth";
import { ROYAL_ELITE_BUSINESS_ID } from "@/lib/royal-elite";

export type BookingQuestionType = "text" | "long_text" | "select" | "date" | "address";

export interface BookingQuestion {
  id: string;
  label: string;
  type: BookingQuestionType;
  required: boolean;
  options?: string[];
}

export interface FreeConsultService {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  serviceLocationType: string | null;
  imageUrl: string | null;
  bookingQuestions: BookingQuestion[];
}

export type FreeServicesResult =
  | { ok: true; available: boolean; services: FreeConsultService[] }
  | { ok: false; status: number; data: Record<string, unknown> };

/**
 * Royal Elite's live free-consultation services. Sends the free-consultation capability, keeps
 * only services the backend marks isFreeConsultation === true. A hidden business (backend 404)
 * is "not available", not an error.
 */
export async function fetchFreeServices(): Promise<FreeServicesResult> {
  const res = await proxyToBackend(`/api/businesses/${ROYAL_ELITE_BUSINESS_ID}/services`, {
    method: "GET",
    headers: { "X-Outsyde-Capabilities": "free-consultation" },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 404) return { ok: true, available: false, services: [] };
  if (!res.ok) return { ok: false, status: res.status, data };

  const raw = Array.isArray(data.services) ? (data.services as Record<string, unknown>[]) : [];
  const services: FreeConsultService[] = raw
    .filter((s) => s && s.isFreeConsultation === true && typeof s.id === "string")
    .map((s) => ({
      id: s.id as string,
      name: typeof s.name === "string" ? s.name : "Free consultation",
      description: typeof s.description === "string" ? s.description : null,
      durationMinutes: typeof s.durationMinutes === "number" ? s.durationMinutes : 0,
      serviceLocationType: typeof s.serviceLocationType === "string" ? s.serviceLocationType : null,
      imageUrl: typeof s.imageUrl === "string" ? s.imageUrl : null,
      bookingQuestions: Array.isArray(s.bookingQuestions) ? (s.bookingQuestions as BookingQuestion[]) : [],
    }));
  return { ok: true, available: services.length > 0, services };
}

/** Same auth forward as app/api/account/bookings/route.ts: Bearer from the cookie + raw cookie. */
export function authHeaders(req: NextRequest): { token: string | null; headers: Record<string, string> } {
  const token = getTokenFromRequest(req);
  const headers: Record<string, string> = { Cookie: req.headers.get("cookie") || "" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { token, headers };
}

/** YYYY-MM-DD that is a real calendar date. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** HH:MM, 24h. */
export function isHhMm(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

const ADDRESS_MAX = 200;
const ZIP_RE = /^\d{5}(-\d{4})?$/;

export interface CustomerAddressFields {
  customerServiceAddress: string;
  customerServiceCity: string;
  customerServiceState: string;
  customerServiceZipCode: string;
}

/**
 * Service address for customer-location services: line1, city, state, zip required, line2
 * optional, each at most 200 characters, zip 5 digits or ZIP+4. Returns per-field errors, or the
 * backend's customerService* fields (line2 is appended to the street line).
 */
export function validateServiceAddress(
  input: unknown,
): { ok: true; fields: CustomerAddressFields } | { ok: false; errors: Record<string, string> } {
  const a = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const line1 = str(a.line1);
  const line2 = str(a.line2);
  const city = str(a.city);
  const state = str(a.state);
  const zip = str(a.zip);
  const errors: Record<string, string> = {};

  if (!line1) errors.line1 = "Street address is required.";
  if (!city) errors.city = "City is required.";
  if (!state) errors.state = "State is required.";
  if (!zip) errors.zip = "ZIP code is required.";
  for (const [key, value] of Object.entries({ line1, line2, city, state, zip })) {
    if (value.length > ADDRESS_MAX) errors[key] = "Must be 200 characters or fewer.";
  }
  if (zip && !errors.zip && !ZIP_RE.test(zip)) errors.zip = "Enter a 5-digit ZIP (or ZIP+4).";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    fields: {
      customerServiceAddress: line2 ? `${line1}, ${line2}` : line1,
      customerServiceCity: city,
      customerServiceState: state,
      customerServiceZipCode: zip,
    },
  };
}
