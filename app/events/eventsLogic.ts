/** Pure helpers for the /events list: date filters, query string, card labels. No React, no network. */
import { fmt, safeZone } from "../e/_shared/format";

export const NEAR_ME_RADIUS_KM = 40;
export const PAGE_SIZE = 20;

export interface EventCard {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  city: string | null;
  state: string | null;
  venueName: string | null;
  addressHidden: boolean;
  host: { name: string; avatarUrl: string | null; kind: string };
  priceFromCents: number | null;
  hasFree: boolean;
  soldOut: boolean;
}

export type WhenFilter = "tonight" | "weekend" | null;

export interface Filters {
  near: boolean;
  free: boolean;
  when: WhenFilter;
}

export interface Coords {
  lat: number;
  lng: number;
}

type Parts = { y: number; m: number; d: number; h: number; mi: number; s: number; dow: number };

/** Wall clock parts of an instant in a time zone. dow: 0 is Sunday. */
export function zonedParts(date: Date, tz: string): Parts {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: safeZone(tz), hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
  });
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(date)) if (x.type !== "literal") p[x.type] = Number(x.value);
  const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return { y: p.year, m: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second, dow };
}

function offsetMs(at: number, tz: string): number {
  const p = zonedParts(new Date(at), tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(at / 1000) * 1000;
}

/** The instant at which the wall clock in `tz` reads y-m-d h:mi:s. Month is 1 to 12; days may overflow. */
export function zonedInstant(y: number, m: number, d: number, h: number, mi: number, s: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi, s);
  let t = guess - offsetMs(guess, tz);
  t = guess - offsetMs(t, tz);
  return new Date(t);
}

/** Tonight: now until 23:59:59 today in the viewer's time zone. */
export function tonightRange(now: Date, tz: string): { from: string; to: string } {
  const p = zonedParts(now, tz);
  return { from: now.toISOString(), to: zonedInstant(p.y, p.m, p.d, 23, 59, 59, tz).toISOString() };
}

/**
 * This weekend: Friday 5:00 PM to Sunday 23:59:59 of the current or coming weekend, in the viewer's
 * time zone. Already inside it, the range starts now.
 */
export function weekendRange(now: Date, tz: string): { from: string; to: string } {
  const p = zonedParts(now, tz);
  const back = p.dow === 6 ? 1 : p.dow === 0 ? 2 : 0; // Saturday and Sunday belong to the weekend that began on Friday
  const ahead = p.dow >= 1 && p.dow <= 4 ? 5 - p.dow : 0;
  const day = (offset: number) => {
    const t = new Date(Date.UTC(p.y, p.m - 1, p.d + offset));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  };
  const fri = day(ahead - back);
  const sun = day(ahead - back + 2);
  const start = zonedInstant(fri.y, fri.m, fri.d, 17, 0, 0, tz);
  const end = zonedInstant(sun.y, sun.m, sun.d, 23, 59, 59, tz);
  return { from: (now.getTime() > start.getTime() ? now : start).toISOString(), to: end.toISOString() };
}

export function buildQuery(opts: {
  filters: Filters;
  now: Date;
  tz: string;
  coords?: Coords | null;
  cursor?: string | null;
  limit?: number;
}): string {
  const q = new URLSearchParams();
  const { filters } = opts;
  if (filters.when) {
    const r = filters.when === "tonight" ? tonightRange(opts.now, opts.tz) : weekendRange(opts.now, opts.tz);
    q.set("from", r.from);
    q.set("to", r.to);
  }
  if (filters.free) q.set("free", "true");
  if (filters.near && opts.coords) {
    q.set("lat", String(opts.coords.lat));
    q.set("lng", String(opts.coords.lng));
    q.set("radiusKm", String(NEAR_ME_RADIUS_KM));
  }
  q.set("limit", String(opts.limit ?? PAGE_SIZE));
  if (opts.cursor) q.set("cursor", opts.cursor);
  return q.toString();
}

const ymd = (p: Parts) => `${p.y}-${p.m}-${p.d}`;

/** "TONIGHT · 7:30 PM" for an event starting today at 5:00 PM or later, "TODAY · 10:00 AM" before 5:00 PM, else "SAT, OCT 25 · 9:00 PM", in the event's own time zone. */
export function whenLabel(e: { startsAt: string; timezone: string }, now: Date): string {
  const start = new Date(e.startsAt);
  const time = fmt(e.startsAt, e.timezone, { hour: "numeric", minute: "2-digit" });
  if (ymd(zonedParts(start, e.timezone)) === ymd(zonedParts(now, e.timezone))) {
    const hour = zonedParts(start, e.timezone).h;
    return `${hour >= 17 ? "TONIGHT" : "TODAY"} · ${time}`.toUpperCase();
  }
  const day = fmt(e.startsAt, e.timezone, { weekday: "short", month: "short", day: "numeric" });
  return `${day} · ${time}`.toUpperCase();
}

function dollars(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

/** Price line from what the list returns: soldOut, hasFree, priceFromCents. Empty when there is nothing to say. */
export function priceLabel(e: Pick<EventCard, "priceFromCents" | "hasFree" | "soldOut">): string {
  if (e.soldOut) return "Sold out";
  if (e.priceFromCents != null && e.priceFromCents > 0) {
    return e.hasFree ? `Free RSVP or from ${dollars(e.priceFromCents)}` : `From ${dollars(e.priceFromCents)}`;
  }
  if (e.hasFree) return "Free RSVP";
  return "";
}

/** "The Hall · Freeport, NY". A hidden address leaves only city and state (the backend already dropped the venue). */
export function whereLabel(e: Pick<EventCard, "venueName" | "city" | "state" | "addressHidden">): string {
  const place = [e.city, e.state].filter((x): x is string => !!x && x.trim() !== "").join(", ");
  const venue = e.venueName && e.venueName.trim() ? e.venueName.trim() : "";
  const line = [venue, place].filter(Boolean).join(" · ");
  if (line) return line;
  return e.addressHidden ? "Address shared with ticket holders" : "";
}

export function isEventCard(x: unknown): x is EventCard {
  const e = x as EventCard | null;
  return !!e && typeof e.id === "string" && typeof e.slug === "string" && typeof e.title === "string" &&
    typeof e.startsAt === "string" && typeof e.timezone === "string";
}
