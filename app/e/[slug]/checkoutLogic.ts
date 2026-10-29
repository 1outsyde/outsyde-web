/** Pure decisions for the paid checkout. No React, no browser, so they can be unit tested with tsx. */

import type { EventInfo, TicketType } from "./types";
import { clampQty } from "../_shared/format";

export type Phase =
  | "starting"
  | "unavailable"
  | "holding"
  | "hold-error"
  | "hold-ended"
  | "paying"
  | "confirming"
  | "done"
  | "closed"
  | "refunded"
  | "late";

export type PiStatus = "succeeded" | "processing" | null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Order status from the backend to the next phase. "pending" (or anything unknown) keeps the current phase. */
export function phaseForOrder(status: string | undefined, keep: Phase): Phase {
  switch (status) {
    case "completed":
      return "done";
    case "expired":
    case "cancelled":
      return "closed";
    case "refunding":
    case "refunded":
      return "refunded";
    default:
      return keep;
  }
}

/** The hold timer: at or past the expiry the hold is over. */
export function holdPhase(nowMs: number, expiresAtMs: number): "holding" | "hold-ended" {
  return nowMs >= expiresAtMs ? "hold-ended" : "holding";
}

/** The backend refuses tickets and RSVPs once the event has started, so the page does too. */
export function hasStarted(e: { startsAt: string }, nowMs: number): boolean {
  return new Date(e.startsAt).getTime() <= nowMs;
}

export interface Entry {
  type: TicketType;
  qty: number;
}

/**
 * Entry decision from ?checkout= and ?qty= plus the event data. Null means "ignore the params, show the normal page".
 * The caller computes this once per set of params and freezes it while a checkout is mounted.
 */
export function entryDecision(
  p: { checkout: string | null; qty: string | null },
  event: Pick<EventInfo, "status" | "startsAt">,
  types: TicketType[],
  nowMs: number,
): Entry | null {
  if (!p.checkout || !UUID_RE.test(p.checkout) || !p.qty || !/^\d{1,3}$/.test(p.qty)) return null;
  const qtyN = Number(p.qty);
  if (!Number.isInteger(qtyN) || qtyN < 1) return null;
  const type = types.find((t) => t.id === p.checkout);
  if (!type || type.salesStatus !== "on_sale" || type.priceCents <= 0) return null;
  if (event.status !== "published" || hasStarted(event, nowMs)) return null;
  return { type, qty: clampQty(type, qtyN) };
}

/** Same params, same decision: a refresh of the ticket types never changes an open checkout. */
export function paramsKey(p: { checkout: string | null; qty: string | null }): string {
  return `${p.checkout ?? ""}|${p.qty ?? ""}`;
}

export type ConfirmInput =
  | { thrown: true }
  | { thrown?: false; error?: { code?: string; payment_intent?: { status?: string } } | null; paymentIntentStatus?: string };

export type ConfirmOutcome =
  | { next: "confirming"; pi: "succeeded" | "processing" }
  | { next: "check-payment" } // unknown result: ask Stripe, then re-ask the backend with the same key
  | { next: "holding"; showStripeError: boolean };

/** What to do with stripe.confirmCardPayment's answer. A paid buyer is never left on the Pay form. */
export function confirmOutcome(r: ConfirmInput): ConfirmOutcome {
  if ("thrown" in r && r.thrown) return { next: "check-payment" };
  const x = r as Exclude<ConfirmInput, { thrown: true }>;
  if (x.error) {
    const st = x.error.payment_intent?.status;
    if (st === "succeeded") return { next: "confirming", pi: "succeeded" };
    if (st === "processing") return { next: "confirming", pi: "processing" };
    if (x.error.code === "payment_intent_unexpected_state") return { next: "check-payment" };
    return { next: "holding", showStripeError: true };
  }
  if (x.paymentIntentStatus === "succeeded") return { next: "confirming", pi: "succeeded" };
  if (x.paymentIntentStatus === "processing") return { next: "confirming", pi: "processing" };
  return { next: "holding", showStripeError: false };
}

/** After asking Stripe for the PaymentIntent: paid or processing goes to confirming, anything else re-asks the backend. */
export function afterRetrieve(status: string | undefined): "confirming-succeeded" | "confirming-processing" | "retry-same" {
  if (status === "succeeded") return "confirming-succeeded";
  if (status === "processing") return "confirming-processing";
  return "retry-same";
}

/** Copy for the 3 minute fallback. "Went through" only when Stripe said succeeded. */
export function lateCopy(pi: PiStatus): string {
  if (pi === "succeeded") return "Your payment went through. Your tickets will appear in My Tickets in a few minutes.";
  if (pi === "processing") return "Your payment is processing. Your tickets will appear in My Tickets once it clears.";
  return "We're still confirming your order. Check My Tickets in a few minutes.";
}

export interface Saved {
  key: string;
  orderId?: string;
  stage: "holding" | "confirming";
  pi?: PiStatus;
}

export function storageKey(eventId: string, ticketTypeId: string, qty: number): string {
  return `co:${eventId}:${ticketTypeId}:${qty}`;
}

export function parseSaved(raw: string | null): Saved | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v.key !== "string" || !v.key) return null;
    if (v.stage !== "holding" && v.stage !== "confirming") return null;
    if (v.stage === "confirming" && typeof v.orderId !== "string") return null;
    return { key: v.key, orderId: typeof v.orderId === "string" ? v.orderId : undefined, stage: v.stage, pi: v.pi === "succeeded" || v.pi === "processing" ? v.pi : null };
  } catch {
    return null;
  }
}

/** What the saved entry does when a phase is reached. Final orders are cleared so the same ticket and qty can be bought again. */
export function storageAfterPhase(phase: Phase): "keep" | "clear" {
  return phase === "done" || phase === "refunded" || phase === "closed" ? "clear" : "keep";
}

/**
 * A key that came from storage can point at an order that has since expired or been settled under other rules.
 * Then, once, start again with a new key instead of showing "sales are closed". A real closed sale shows its message.
 */
export function shouldQuietRestart(code: string, keyFromStorage: boolean, alreadyRestarted: boolean): boolean {
  return keyFromStorage && !alreadyRestarted && (code === "CHECKOUT_CLOSED" || code === "IDEMPOTENCY_KEY_REUSED");
}

/** A failed Stripe load only matters while the checkout is still starting. It never replaces confirming, done or any later screen. */
export function unavailableFrom(phase: Phase): Phase {
  return phase === "starting" ? "unavailable" : phase;
}

/**
 * Apple Pay on goutsyde.com (2026-10-29, Apple Pay only by Legend's call).
 * The Express Checkout Element runs in its own Elements group, beside the card one. Stripe requires the amount here
 * to equal the PaymentIntent's, which the backend creates for the hold total (ticketCheckout.ts, fees.totalCents).
 * Null means: show no Apple Pay (nothing valid to charge).
 */
export function applePayElementsOptions(totalCents: number): { mode: "payment"; amount: number; currency: "usd" } | null {
  if (!Number.isInteger(totalCents) || totalCents <= 0) return null;
  return { mode: "payment", amount: totalCents, currency: "usd" };
}

/**
 * Only Apple Pay may show. Stripe would otherwise add every wallet the account allows (Google Pay, Link, PayPal,
 * Amazon Pay, Klarna are on in Stripe's settings). White button: the checkout is dark.
 */
export function applePayButtonOptions() {
  return {
    paymentMethods: { applePay: "auto", googlePay: "never", link: "never", paypal: "never", amazonPay: "never", klarna: "never" },
    buttonTheme: { applePay: "white" },
    buttonType: { applePay: "buy" },
  } as const;
}

/** Apple Pay opens only while the seats are held and no other payment is running. */
export function canOpenApplePay(s: { paying: boolean; remainingMs: number }): boolean {
  return !s.paying && s.remainingMs > 0;
}
