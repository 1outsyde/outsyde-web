"use client";

/**
 * Paid ticket checkout, opened from the event page at /e/<slug>?checkout=<ticketTypeId>&qty=<n>.
 *
 * Quantity is fixed inside checkout (a "Change" link goes back to the event page). A paid hold can't be
 * cancelled by the buyer, so changing the quantity here would stack a second hold on the first and could
 * trip the per account limit or the sold out check on the buyer's own seats.
 *
 * Money lines come from the checkout response only. Tickets are shown as issued only after
 * GET /api/events/orders/:id says "completed", never from the Stripe result alone.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { EventInfo, TicketType } from "./types";

const GENERIC_ERROR = "Something went wrong. Try again.";
const NO_PAYMENTS = "Payments aren't available right now. Try again later.";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_EVERY_MS = 2000;
const POLL_FOR_MS = 3 * 60 * 1000;

const CODE_COPY: Record<string, string> = {
  SOLD_OUT: "Sorry, these tickets just sold out.",
  EVENT_FULL: "Sorry, this event is full.",
  LIMIT_REACHED: "You already have the most tickets allowed for this event.",
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
/** Failures where the same attempt (same key) can simply be sent again. */
const RETRY_CODES = new Set(["TRY_AGAIN", "PAYMENT_SETUP_FAILED"]);

const appearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#1A3C34",
    colorBackground: "#141414",
    colorText: "#F5F0E6",
    colorTextPlaceholder: "#666666",
    colorDanger: "#ff8a80",
    fontFamily: "'Hanken Grotesk', Helvetica, Arial, sans-serif",
    borderRadius: "12px",
  },
};

/* ---------- helpers ---------- */

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function newKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function when(e: EventInfo): string {
  let tz = e.timezone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    tz = "UTC";
  }
  const d = new Date(e.startsAt);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d);
  return `${day} · ${time}`;
}

type ApiBody = { error?: unknown; code?: unknown } | null;
function failure(status: number, body: ApiBody): { message: string; code: string } {
  const code = typeof body?.code === "string" ? body.code : "";
  if (code && CODE_COPY[code]) return { message: CODE_COPY[code], code };
  if (status >= 500 || !code) return { message: GENERIC_ERROR, code };
  return { message: typeof body?.error === "string" && body.error ? body.error : GENERIC_ERROR, code };
}

const stripeCache = new Map<string, Promise<Stripe | null>>();
function stripeFor(key: string): Promise<Stripe | null> {
  let p = stripeCache.get(key);
  if (!p) {
    p = loadStripe(key).catch(() => null);
    stripeCache.set(key, p);
  }
  return p;
}

interface Hold {
  orderId: string;
  clientSecret: string;
  holdExpiresAt: number;
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
}
interface OrderInfo {
  id?: string;
  status?: string;
  tickets?: unknown[];
}

type Phase =
  | "starting" // loading Stripe, then creating the hold
  | "unavailable" // Stripe could not load
  | "holding" // hold exists, waiting for the card
  | "hold-error" // the hold could not be created
  | "hold-ended" // the timer reached zero
  | "paying" // confirmCardPayment in flight
  | "confirming" // polling the order
  | "done" // order completed
  | "closed" // order expired or cancelled
  | "refunded"
  | "late"; // paid, but not completed within 3 minutes

/* ---------- entry: reads the URL ---------- */

export function CheckoutHost({ slug, event, ticketTypes, onPaid }: { slug: string; event: EventInfo; ticketTypes: TicketType[]; onPaid?: () => void }) {
  const params = useSearchParams();
  const id = params.get("checkout");
  const qtyRaw = params.get("qty");
  if (!id || !UUID_RE.test(id) || !qtyRaw || !/^\d{1,3}$/.test(qtyRaw)) return null;
  const qtyN = Number(qtyRaw);
  if (!Number.isInteger(qtyN) || qtyN < 1) return null;
  const type = ticketTypes.find((t) => t.id === id);
  // Nothing can be bought on a draft, cancelled or finished event, or for a free or off sale type.
  if (!type || type.salesStatus !== "on_sale" || type.priceCents <= 0) return null;
  if (event.status !== "published" || new Date(event.endsAt).getTime() < Date.now()) return null;
  const caps = [type.maxPerOrder, type.remaining, type.perAccountLimit].filter((n): n is number => typeof n === "number" && n > 0);
  const max = caps.length ? Math.max(1, Math.min(...caps)) : 10;
  const min = Math.min(type.minPerOrder && type.minPerOrder > 0 ? type.minPerOrder : 1, max);
  const qty = Math.min(Math.max(qtyN, min), max);
  return <Checkout key={`${id}:${qty}`} slug={slug} event={event} type={type} qty={qty} onPaid={onPaid} />;
}

/* ---------- checkout ---------- */

export default function Checkout({ slug, event, type, qty, onPaid }: { slug: string; event: EventInfo; type: TicketType; qty: number; onPaid?: () => void }) {
  const router = useRouter();
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [hold, setHold] = useState<Hold | null>(null);
  const [holdError, setHoldError] = useState<{ message: string; code: string } | null>(null);
  const [attempt, setAttempt] = useState(() => ({ key: newKey(), n: 0 }));
  const [now, setNow] = useState(() => Date.now());
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const loginHref = `/login?return=${encodeURIComponent(`/e/${slug}?checkout=${type.id}&qty=${qty}`)}`;

  const close = useCallback(() => {
    router.replace(`/e/${slug}`, { scroll: false });
  }, [router, slug]);

  // Full screen: keep the page behind from scrolling.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Load Stripe once. A missing key or a failed script means no Pay button at all.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let key = "";
      try {
        const res = await fetch("/api/events/stripe-config", { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (res.ok && typeof body?.publishableKey === "string") key = body.publishableKey.trim();
      } catch {
        /* key stays empty */
      }
      const s = key ? await stripeFor(key) : null;
      if (cancelled) return;
      if (!s) {
        setPhase("unavailable");
        return;
      }
      setStripe(s);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Create the hold (once Stripe is ready). The same key is reused for retries of the same attempt.
  useEffect(() => {
    if (!stripe) return;
    let cancelled = false;
    setPhase("starting");
    setHoldError(null);
    (async () => {
      try {
        const res = await fetch(`/api/events/${encodeURIComponent(event.id)}/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketTypeId: type.id, quantity: qty, idempotencyKey: attempt.key }),
        });
        if (cancelled) return;
        if (res.status === 401) {
          window.location.href = loginHref;
          return;
        }
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setHoldError(failure(res.status, body));
          setPhase("hold-error");
          return;
        }
        // Already paid under this key: go straight to the order.
        if (body?.order) {
          setOrder(body.order);
          setOrderId(typeof body.order.id === "string" ? body.order.id : null);
          setPhase(phaseForOrder(body.order, "confirming"));
          return;
        }
        if (
          typeof body?.orderId !== "string" ||
          typeof body?.clientSecret !== "string" ||
          typeof body?.totalCents !== "number" ||
          typeof body?.subtotalCents !== "number" ||
          typeof body?.serviceFeeCents !== "number"
        ) {
          setHoldError({ message: GENERIC_ERROR, code: "" });
          setPhase("hold-error");
          return;
        }
        const expires = Date.parse(body.holdExpiresAt);
        setHold({
          orderId: body.orderId,
          clientSecret: body.clientSecret,
          holdExpiresAt: Number.isFinite(expires) ? expires : Date.now() + 10 * 60 * 1000,
          subtotalCents: body.subtotalCents,
          serviceFeeCents: body.serviceFeeCents,
          totalCents: body.totalCents,
        });
        setOrderId(body.orderId);
        setNow(Date.now());
        setPhase("holding");
      } catch {
        if (cancelled) return;
        setHoldError({ message: GENERIC_ERROR, code: "" });
        setPhase("hold-error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe, attempt, event.id, type.id, qty]);

  // Hold timer.
  useEffect(() => {
    if (phase !== "holding" || !hold) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= hold.holdExpiresAt) setPhase("hold-ended");
    };
    tick();
    const h = setInterval(tick, 1000);
    return () => clearInterval(h);
  }, [phase, hold]);

  // Poll the order until it is completed (or ends), for up to 3 minutes.
  useEffect(() => {
    if (phase !== "confirming" || !orderId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    const poll = async () => {
      try {
        const res = await fetch(`/api/events/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) {
          window.location.href = loginHref;
          return;
        }
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && body?.order) {
          const next = phaseForOrder(body.order, "confirming");
          if (next !== "confirming") {
            setOrder(body.order);
            setPhase(next);
            return;
          }
        }
      } catch {
        /* keep polling */
      }
      if (cancelled) return;
      if (Date.now() - started >= POLL_FOR_MS) {
        setPhase("late");
        return;
      }
      timer = setTimeout(poll, POLL_EVERY_MS);
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, orderId]);

  useEffect(() => {
    if (phase === "done") onPaid?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function startAgain() {
    setHold(null);
    setAttempt({ key: newKey(), n: 0 });
  }
  function retrySame() {
    setAttempt((a) => ({ key: a.key, n: a.n + 1 }));
  }

  const remaining = hold ? hold.holdExpiresAt - now : 0;
  const css = `
    .co-root { position: fixed; inset: 0; z-index: 400; background: #0B0B0B; color: #F5F0E6; overflow-y: auto; font-family: 'Hanken Grotesk', system-ui, sans-serif; display: flex; justify-content: center; }
    .co-root *, .co-root *::before, .co-root *::after { box-sizing: border-box; }
    .co-panel { width: 100%; max-width: 520px; min-height: 100%; display: flex; flex-direction: column; background: #0B0B0B; }
    .co-head { padding: 16px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #1F1F1F; }
    .co-back { width: 44px; height: 44px; border-radius: 22px; border: 0; background: #161616; color: #F5F0E6; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; flex-shrink: 0; }
    .co-back:hover { color: #E8B930; }
    .co-title { font-family: 'Bebas Neue', sans-serif; font-size: 24px; line-height: 1; font-weight: 400; margin: 0; overflow-wrap: anywhere; }
    .co-sub { font-size: 12px; color: #B8B0A0; margin-top: 2px; }
    .co-body { flex: 1 1 auto; padding: 18px 20px 24px; display: flex; flex-direction: column; gap: 14px; }
    .co-card { background: #141414; border: 1px solid #E8B930; border-radius: 14px; padding: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .co-hold { display: flex; align-items: center; gap: 8px; background: #2E2A1E; border-radius: 12px; padding: 10px 12px; font-size: 13px; color: #F5D26B; }
    .co-line { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    .co-label { font-size: 12px; font-weight: 700; color: #B8B0A0; letter-spacing: 1px; }
    .co-cardbox { min-height: 48px; border-radius: 12px; border: 1px solid #2A2A2A; background: #141414; padding: 14px; }
    .co-foot { flex-shrink: 0; padding: 14px 20px 22px; border-top: 1px solid #1F1F1F; position: sticky; bottom: 0; background: #0B0B0B; }
    .co-pay { width: 100%; height: 54px; border-radius: 27px; border: 0; background: #E8B930; color: #0B0B0B; font: 700 16px 'Hanken Grotesk', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .co-pay:disabled { opacity: 0.6; cursor: default; }
    .co-ghost { height: 44px; padding: 0 22px; border-radius: 22px; border: 1px solid #F5F0E6; background: transparent; color: #F5F0E6; font: 600 14px 'Hanken Grotesk', sans-serif; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
    .co-err { font-size: 13px; color: #ff8a80; }
    .co-msg { text-align: center; padding: 48px 0 8px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .co-msg h2 { font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 34px; margin: 0; line-height: 1; }
    .co-msg p { margin: 0; font-size: 14px; line-height: 1.5; color: #CFC7B8; max-width: 34ch; }
    .co-gold { display: inline-flex; align-items: center; justify-content: center; height: 54px; padding: 0 32px; border-radius: 27px; background: #E8B930; color: #0B0B0B; font-weight: 700; font-size: 16px; }
    .co-gold:hover { color: #0B0B0B; }
    @media (min-width: 560px) { .co-panel { border-left: 1px solid #1F1F1F; border-right: 1px solid #1F1F1F; } }
  `;

  const showSummary = hold && (phase === "holding" || phase === "paying");

  return (
    <div className="co-root" role="dialog" aria-modal="true" aria-label="Ticket checkout">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="co-panel">
        <div className="co-head">
          <button type="button" className="co-back" aria-label="Back to event" onClick={close} disabled={phase === "paying"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 className="co-title">{event.title}</h1>
            <div className="co-sub">{when(event)}</div>
          </div>
        </div>

        {phase === "starting" && (
          <div className="co-body" role="status">
            <div className="co-sub">Getting your tickets ready</div>
          </div>
        )}

        {phase === "unavailable" && (
          <div className="co-body">
            <div className="co-msg" role="alert">
              <h2>Not available</h2>
              <p>{NO_PAYMENTS}</p>
              <button type="button" className="co-ghost" onClick={close}>Back to event</button>
            </div>
          </div>
        )}

        {phase === "hold-error" && holdError && (
          <div className="co-body">
            <div className="co-msg" role="alert">
              <h2>Couldn't hold your tickets</h2>
              <p>{holdError.message}</p>
              {RETRY_CODES.has(holdError.code) || holdError.code === "" ? (
                <button type="button" className="co-ghost" onClick={retrySame}>Try again</button>
              ) : holdError.code === "IDEMPOTENCY_KEY_REUSED" ? (
                <button type="button" className="co-ghost" onClick={startAgain}>Start again</button>
              ) : null}
              <button type="button" className="co-ghost" onClick={close}>Back to event</button>
            </div>
          </div>
        )}

        {phase === "hold-ended" && (
          <div className="co-body">
            <div className="co-msg" role="alert">
              <h2>Your hold ended.</h2>
              <p>Your tickets were released. Start again to hold new ones.</p>
              <button type="button" className="co-ghost" onClick={startAgain}>Start again</button>
            </div>
          </div>
        )}

        {showSummary && hold && (
          <PayPanel
            key={attempt.key}
            hold={hold}
            type={type}
            qty={qty}
            remaining={remaining}
            paying={phase === "paying"}
            stripe={stripe}
            onChange={close}
            onPaying={() => setPhase("paying")}
            onFailed={() => setPhase("holding")}
            onPaid={() => setPhase("confirming")}
          />
        )}

        {phase === "confirming" && (
          <div className="co-body">
            <div className="co-msg" role="status" aria-live="polite">
              <h2>Confirming your tickets</h2>
              <p>This usually takes a few seconds. Please keep this page open.</p>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="co-body">
            <div className="co-msg" role="status">
              <h2>You're going</h2>
              <p>
                {(() => {
                  const n = Array.isArray(order?.tickets) && order.tickets.length ? order.tickets.length : qty;
                  return `${n} ${n === 1 ? "ticket is" : "tickets are"} ready in My Tickets.`;
                })()}
              </p>
              <Link href="/tickets" className="co-gold">View my tickets</Link>
              <button type="button" className="co-ghost" onClick={close}>Back to event</button>
            </div>
          </div>
        )}

        {phase === "closed" && (
          <div className="co-body">
            <div className="co-msg" role="alert">
              <h2>Checkout ended</h2>
              <p>This checkout ended. You weren't charged.</p>
              <button type="button" className="co-ghost" onClick={close}>Back to event</button>
            </div>
          </div>
        )}

        {phase === "refunded" && (
          <div className="co-body">
            <div className="co-msg" role="status">
              <h2>Order refunded</h2>
              <p>This order was refunded. Check My Tickets for details.</p>
              <Link href="/tickets" className="co-ghost">My tickets</Link>
            </div>
          </div>
        )}

        {phase === "late" && (
          <div className="co-body">
            <div className="co-msg" role="status">
              <h2>Payment received</h2>
              <p>Your payment went through. Your tickets will appear in My Tickets in a few minutes.</p>
              <Link href="/tickets" className="co-gold">View my tickets</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Map an order's status to the next phase; `pending` keeps the caller's phase. */
function phaseForOrder(o: OrderInfo, keep: Phase): Phase {
  switch (o.status) {
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

/* ---------- pay form (inside Elements) ---------- */

interface PayProps {
  hold: Hold;
  type: TicketType;
  qty: number;
  remaining: number;
  paying: boolean;
  stripe: Stripe | null;
  onChange: () => void;
  onPaying: () => void;
  onFailed: () => void;
  onPaid: () => void;
}

function PayPanel(props: PayProps) {
  return (
    <Elements stripe={props.stripe} options={{ appearance }}>
      <PayForm {...props} />
    </Elements>
  );
}

function PayForm({ hold, type, qty, remaining, paying, onChange, onPaying, onFailed, onPaid }: PayProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function pay() {
    if (!stripe || !elements || inFlight.current) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    inFlight.current = true;
    setError("");
    onPaying();
    try {
      const result = await stripe.confirmCardPayment(hold.clientSecret, { payment_method: { card } });
      if (result.error) {
        setError(result.error.message || "Your card couldn't be charged. Check the details and try again.");
        onFailed();
        return;
      }
      const status = result.paymentIntent?.status;
      if (status === "succeeded" || status === "processing") {
        onPaid();
        return;
      }
      setError("Your card couldn't be charged. Try again.");
      onFailed();
    } catch {
      setError(GENERIC_ERROR);
      onFailed();
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <>
      <div className="co-body">
        <div className="co-card">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, overflowWrap: "anywhere" }}>{type.name}</div>
            <div className="co-sub">{qty} {qty === 1 ? "ticket" : "tickets"}</div>
          </div>
          <button type="button" className="co-ghost" onClick={onChange} disabled={paying} style={{ height: 36, padding: "0 14px" }}>Change</button>
        </div>

        <div className="co-hold" role="timer" aria-live="off">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          <span>Your tickets are held for {clock(remaining)}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
          <div className="co-line"><div>{qty} x {type.name}</div><div>{money(hold.subtotalCents)}</div></div>
          <div className="co-line" style={{ color: "#B8B0A0" }}><div>Service fee</div><div>{money(hold.serviceFeeCents)}</div></div>
          <div className="co-line" style={{ fontSize: 17, fontWeight: 700, paddingTop: 8, borderTop: "1px solid #1F1F1F" }}><div>Total</div><div>{money(hold.totalCents)}</div></div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="co-label" id="co-card-label">CARD</div>
          <div className="co-cardbox" aria-labelledby="co-card-label">
            <CardElement
              options={{
                style: {
                  base: { color: "#F5F0E6", fontFamily: "'Hanken Grotesk', Helvetica, Arial, sans-serif", fontSize: "15px", iconColor: "#E8B930", "::placeholder": { color: "#8F887B" } },
                  invalid: { color: "#ff8a80", iconColor: "#ff8a80" },
                },
              }}
              onChange={(ev) => setCardError(ev.error ? ev.error.message : "")}
            />
          </div>
          {cardError && <div className="co-err" role="alert">{cardError}</div>}
        </div>
        {error && <div className="co-err" role="alert">{error}</div>}
      </div>
      <div className="co-foot">
        <button type="button" className="co-pay" onClick={pay} disabled={!stripe || !elements || paying}>
          {paying ? "Processing" : `Pay ${money(hold.totalCents)}`}
        </button>
      </div>
    </>
  );
}
