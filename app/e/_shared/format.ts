/** Shared helpers for the event page, checkout and My Tickets. Pure, no React, no network. */

export const GENERIC_ERROR = "Something went wrong. Try again.";

/** The one copy table for backend error codes shown to people. */
export const CODE_COPY: Record<string, string> = {
  SOLD_OUT: "These tickets are sold out.",
  EVENT_FULL: "Sorry, this event is full.",
  LIMIT_REACHED: "You already have the most tickets allowed for this event. If you just started a checkout, try again in a few minutes.",
  SALES_ENDED: "Ticket sales for this event have ended.",
  SALES_NOT_STARTED: "Ticket sales haven't started yet.",
  NOT_OPEN_YET: "This event isn't open for tickets yet.",
  EVENT_STARTED: "This event has already started.",
  EVENT_CANCELLED: "This event was cancelled.",
  CHECKOUT_CLOSED: "Ticket sales are closed right now.",
  PAYMENT_SETUP_FAILED: "We couldn't set up your payment. Try again in a moment.",
  TRY_AGAIN: "Still setting up your checkout. Try again in a moment.",
  FREE_TICKET: "This ticket is free. Go back to the event and tap RSVP.",
  IDEMPOTENCY_KEY_REUSED: "This checkout changed. Start again.",
};

export type ApiBody = { error?: unknown; code?: unknown } | null | undefined;

/**
 * Mapped error copy, used for page loads and buyer flows: a known code gets its copy; a server error
 * (status 500 or more) or a body without a code gets the generic line; otherwise the backend's own message.
 * Host actions (cancel, refund, door team, undo) use backendMessage in app/events/_host/manageLogic.ts instead,
 * which always shows the backend's full text.
 */
export function failureCopy(status: number, body: ApiBody): { message: string; code: string } {
  const code = typeof body?.code === "string" ? body.code : "";
  if (code && CODE_COPY[code]) return { message: CODE_COPY[code], code };
  if (status >= 500 || !code) return { message: GENERIC_ERROR, code };
  return { message: typeof body?.error === "string" && body.error.trim() ? body.error : GENERIC_ERROR, code };
}

export function errorCopy(status: number, body: ApiBody): string {
  return failureCopy(status, body).message;
}

/** Only a Stripe hosted page (https, stripe.com or a subdomain) is a valid place to send someone for payout setup. */
export function stripeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:") return null;
    if (host !== "stripe.com" && !host.endsWith(".stripe.com")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Cents as "$20.00". Always two decimals. */
export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function newKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** The site fonts (Bebas Neue for titles, Hanken Grotesk for text), loaded with a <link> by the event and host pages. */
export const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap";

/** The browser's IANA time zone, "UTC" when it can't be read (server render, old browsers). */
export function browserZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}

export function safeZone(tz: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

export function fmt(iso: string, tz: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: safeZone(tz), ...opts }).format(new Date(iso));
}

/** "Sat, Oct 31 · 9:00 PM" in the event's own time zone. */
export function startLine(e: { startsAt: string; timezone: string }): string {
  const day = fmt(e.startsAt, e.timezone, { weekday: "short", month: "short", day: "numeric" });
  const time = fmt(e.startsAt, e.timezone, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

/** "SAT, OCT 25 · 9:00 PM TO 2:00 AM" in the event's own time zone. */
export function rangeLine(e: { startsAt: string; endsAt: string; timezone: string }): string {
  const day = fmt(e.startsAt, e.timezone, { weekday: "short", month: "short", day: "numeric" });
  const t = (iso: string) => fmt(iso, e.timezone, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${t(e.startsAt)} to ${t(e.endsAt)}`.toUpperCase();
}

/** "Full address on Saturday, October 31 at 6:00 PM" (no trailing period). */
export function revealLine(iso: string, tz: string): string {
  const day = fmt(iso, tz, { weekday: "long", month: "long", day: "numeric" });
  const time = fmt(iso, tz, { hour: "numeric", minute: "2-digit" });
  return `Full address on ${day} at ${time}`;
}

interface QtyLimits {
  minPerOrder: number | null;
  maxPerOrder: number | null;
  remaining: number | null;
  perAccountLimit: number | null;
}

export function maxQty(t: QtyLimits): number {
  const caps = [t.maxPerOrder, t.remaining, t.perAccountLimit].filter((n): n is number => typeof n === "number" && n > 0);
  return caps.length ? Math.max(1, Math.min(...caps)) : 10;
}

export function minQty(t: QtyLimits): number {
  return Math.min(t.minPerOrder && t.minPerOrder > 0 ? t.minPerOrder : 1, maxQty(t));
}

export function clampQty(t: QtyLimits, q: number): number {
  return Math.min(Math.max(q, minQty(t)), maxQty(t));
}
