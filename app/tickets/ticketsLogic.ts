/** Pure helpers for the My Tickets page. No React, no network. */

import { startLine, revealLine, GENERIC_ERROR, errorCopy as sharedErrorCopy } from "../e/_shared/format";

export { GENERIC_ERROR };

export interface TicketEvent {
  id: string;
  slug: string;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  coverImageUrl: string | null;
  city: string | null;
  state: string | null;
  venueName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  addressHidden: boolean;
  addressRevealAt: string | null;
}

export interface MyTicket {
  id: string;
  code: string;
  status: string;
  orderId: string;
  checkedInAt: string | null;
  ticketTypeName: string;
  qrUrl: string | null;
  walletUrl?: string | null;
  event: TicketEvent;
}

/** Returns the string only for http: or https: URLs, else null. */
export function safeHttpUrl(u: unknown): string | null {
  if (typeof u !== "string" || !u) return null;
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

/** Same rule as the event page: status 500 or more, or no code, shows the generic line. */
export function errorCopy(status: number, body: unknown): string {
  return sharedErrorCopy(status, body as { error?: unknown; code?: unknown } | null);
}

/** "Sat, Oct 31 · 9:00 PM" in the event's own time zone. */
export function whenLine(e: Pick<TicketEvent, "startsAt" | "timezone">): string {
  return startLine(e);
}

export interface PlaceInfo {
  visible: boolean;
  lines: string[];
  note: string | null;
  /** Visible address as one string, or the city and state when hidden. */
  text: string;
}

export function placeInfo(e: TicketEvent): PlaceInfo {
  const cityLine = [e.city, e.state].filter(Boolean).join(", ");
  if (e.addressHidden) {
    const note = e.addressRevealAt
      ? `${revealLine(e.addressRevealAt, e.timezone)}.`
      : null;
    const lines = cityLine ? [cityLine] : [];
    return { visible: false, lines, note, text: cityLine };
  }
  const street = [e.addressLine1, e.addressLine2].filter(Boolean).join(", ");
  const lines = [e.venueName, street, cityLine].filter((x): x is string => !!x);
  return { visible: true, lines, note: null, text: lines.join(", ") };
}

/** Google Maps search link, only when the street address is visible. */
export function directionsUrl(e: TicketEvent): string | null {
  if (e.addressHidden || !e.addressLine1) return null;
  const q = placeInfo(e).text;
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

export function splitSections(tickets: MyTicket[], now: Date = new Date()): { upcoming: MyTicket[]; past: MyTicket[] } {
  const upcoming: MyTicket[] = [];
  const past: MyTicket[] = [];
  for (const t of tickets) {
    (new Date(t.event.endsAt).getTime() > now.getTime() ? upcoming : past).push(t);
  }
  return { upcoming, past };
}

export interface EventGroup {
  event: TicketEvent;
  tickets: MyTicket[];
}

export function groupByEvent(tickets: MyTicket[]): EventGroup[] {
  const map = new Map<string, EventGroup>();
  for (const t of tickets) {
    const g = map.get(t.event.id);
    if (g) g.tickets.push(t);
    else map.set(t.event.id, { event: t.event, tickets: [t] });
  }
  return Array.from(map.values());
}

/* ---------- calendar file ---------- */

export function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

function icsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(" " + line.slice(i, i + 74));
  return parts.join("\r\n");
}

export function icsFileName(e: Pick<TicketEvent, "slug">): string {
  return `${e.slug}.ics`;
}

export function buildIcs(t: MyTicket, now: Date = new Date()): string {
  const e = t.event;
  const place = placeInfo(e).text;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Outsyde//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${t.id}`,
    `DTSTAMP:${icsUtc(now)}`,
    `DTSTART:${icsUtc(new Date(e.startsAt))}`,
    `DTEND:${icsUtc(new Date(e.endsAt))}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    ...(place ? [`LOCATION:${escapeIcs(place)}`] : []),
    `URL:https://goutsyde.com/e/${e.slug}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/**
 * Whether this browser can add an Apple Wallet pass (p3-wallet): any browser on iPhone, Safari on a Mac. Not iPad
 * (no Wallet app for passes; iPadOS Safari says "Macintosh", so a touch screen Mac is treated as an iPad), not
 * Android or Windows (they would just download a file they can't open).
 */
export function canAddToAppleWallet(userAgent: string | null | undefined, maxTouchPoints = 0): boolean {
  const ua = userAgent ?? "";
  if (/iPhone|iPod/.test(ua)) return true;
  if (/iPad|Android/.test(ua)) return false;
  if (/Macintosh/.test(ua)) {
    if (maxTouchPoints > 1) return false;
    return /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS|Edg\/|Firefox\/|FxiOS|OPR\//.test(ua);
  }
  return false;
}
