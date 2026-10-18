// Shared booking status helpers for the vendor and photographer dashboards (Part D).
//
// Booking statuses: draft, pending_payment (unpaid checkout), pending_provider (a real request,
// card on hold, waiting for the business or photographer), confirmed, completed, canceled,
// expired, no_show, declined. Legacy rows may still carry "pending" or "cancelled".

// Unpaid checkouts are not real requests. Backend #326 already leaves them out of the provider
// lists; this is a defensive client side filter in case an older backend is still deployed.
const HIDDEN_STATUSES = new Set(["draft", "pending_payment"]);

export function isVisibleBooking(status: string | null | undefined): boolean {
  return !HIDDEN_STATUSES.has(String(status ?? "").toLowerCase());
}

export function isPendingRequest(status: string | null | undefined): boolean {
  const s = String(status ?? "").toLowerCase();
  return s === "pending_provider" || s === "pending";
}

const STATUS_LABELS: Record<string, string> = {
  pending_provider: "Pending",
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  canceled: "Canceled",
  cancelled: "Canceled",
  declined: "Declined",
  rejected: "Declined",
  expired: "Expired",
  no_show: "No show",
  refunded: "Refunded",
  paid: "Paid",
};

export function bookingStatusLabel(status: string | null | undefined): string {
  const s = String(status ?? "").toLowerCase();
  if (STATUS_LABELS[s]) return STATUS_LABELS[s];
  if (!s) return "Unknown";
  const words = s.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function bookingStatusColor(status: string | null | undefined): string {
  const s = String(status ?? "").toLowerCase();
  if (["confirmed", "completed", "paid"].includes(s)) return "status-green";
  if (isPendingRequest(s)) return "status-yellow";
  if (["canceled", "cancelled", "declined", "rejected", "refunded"].includes(s)) return "status-red";
  // expired, no_show and anything unknown stay neutral grey.
  return "status-gray";
}

export type BookingFilter = "all" | "pending" | "upcoming" | "past" | "expired" | "canceled";

export const BOOKING_FILTERS: { key: BookingFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "expired", label: "Expired" },
  { key: "canceled", label: "Canceled" },
];

function todayKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Booking dates are stored as YYYY-MM-DD text. Returns null when the date cannot be read.
function isTodayOrLater(date: string | null | undefined): boolean | null {
  const raw = String(date ?? "").trim();
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1] >= todayKey();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return parsed.getTime() >= startOfToday.getTime();
}

export function matchesBookingFilter(
  booking: { status: string | null | undefined; date?: string | null },
  filter: BookingFilter,
): boolean {
  const s = String(booking.status ?? "").toLowerCase();
  switch (filter) {
    case "all":
      return true;
    case "pending":
      return isPendingRequest(s);
    case "upcoming":
      // A confirmed booking whose date cannot be read stays in Upcoming so it is never lost.
      return s === "confirmed" && isTodayOrLater(booking.date) !== false;
    case "past":
      return s === "completed" || s === "no_show" || (s === "confirmed" && isTodayOrLater(booking.date) === false);
    case "expired":
      return s === "expired";
    case "canceled":
      return ["canceled", "cancelled", "declined", "rejected"].includes(s);
  }
}

// Sends the browser's time zone once per browser session so the signed in owner's businesses and
// photographer profile get one when they have none (the backend never overwrites an existing one
// here). Fire and forget: never throws, never blocks rendering.
const TIME_ZONE_FLAG = "outsyde_tz_reported";

export function reportTimeZoneOnce(): void {
  try {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(TIME_ZONE_FLAG)) return;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone) return;
    window.sessionStorage.setItem(TIME_ZONE_FLAG, "1");
    fetch("/api/me/time-zone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeZone, overwrite: false }),
    }).catch(() => { /* non-blocking */ });
  } catch {
    // sessionStorage can be blocked (private mode, storage disabled). Skipping is fine.
  }
}
