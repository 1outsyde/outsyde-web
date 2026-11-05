"use client";

/**
 * goutsyde.com/q/<code> (Quotes step 5b, Legend 2026-11-05 step 5 calls 1 to 8).
 *
 *   - Signed out: a preview (business look, title, date, price) and Sign in to pay, coming back here.
 *   - Signed in as another account: no details, a plain message.
 *   - The customer: pay the deposit or the full price (card or Apple Pay), approve or decline extras (a bank check
 *     opens on the page), Update your card, Pay for extras, Confirm or Report a problem within 6 hours, and notes
 *     with the business (the same chat as the app).
 *   - The business: a read only view and the notes; quotes are managed in the app.
 *
 * Money and status always come from the backend; a payment is shown as done only once the backend says so.
 * Copy uses commas and periods only and never the fee rate.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadStripe, type Stripe, type PaymentIntentResult } from "@stripe/stripe-js";
import { Elements, CardElement, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-stores";
import {
  balanceLine, brandColor, closedLine, decidedLine, extraStatusLine, extrasPaymentLine, inkOn, intentOutcome, loginHref, money,
  payLines, reportProblem, safeImage, stageOf, whenLine, windowLeft, MAX_PHOTOS,
  type Action, type Business, type Extra, type IntentKind, type Preview, type Quote,
} from "./quoteLogic";

type Access = "customer" | "vendor" | "admin";
type View =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "other" }
  | { kind: "error"; message: string }
  | { kind: "preview"; preview: Preview }
  | { kind: "quote"; access: Access; quote: Quote };

type Note = { id: string; senderId: string; content: string; kind: string; mediaItems: string[]; createdAt: string };

const GENERIC = "Something went wrong. Try again.";
const msgOf = (body: unknown): string => {
  const b = body as { message?: unknown; error?: unknown } | null;
  return (typeof b?.message === "string" && b.message) || (typeof b?.error === "string" && b.error) || GENERIC;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- backend JSON, read field by field
type Json = any;
async function post(path: string, body: unknown = {}): Promise<{ status: number; body: Json }> {
  try {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json().catch(() => null) };
  } catch {
    return { status: 0, body: { error: "Check your connection and try again." } };
  }
}
async function get(path: string): Promise<{ status: number; body: Json }> {
  try {
    const r = await fetch(path, { cache: "no-store" });
    return { status: r.status, body: await r.json().catch(() => null) };
  } catch {
    return { status: 0, body: null };
  }
}

let stripePromise: Promise<Stripe | null> | null = null;
function stripeOnce(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = (async () => {
      const r = await get("/api/events/stripe-config");
      const key = typeof r.body?.publishableKey === "string" ? r.body.publishableKey.trim() : "";
      return key ? loadStripe(key).catch(() => null) : null;
    })();
  }
  return stripePromise;
}

const appearance = {
  theme: "night" as const,
  variables: { colorBackground: "#17161B", colorText: "#F2F0EA", colorDanger: "#ff8a80", borderRadius: "12px", fontFamily: "Manrope, system-ui, sans-serif" },
};
const cardStyle = {
  style: {
    base: { color: "#F2F0EA", fontFamily: "Manrope, system-ui, sans-serif", fontSize: "15px", iconColor: "#E2BE4B", "::placeholder": { color: "#8F8A97" } },
    invalid: { color: "#ff8a80", iconColor: "#ff8a80" },
  },
};

export default function QuoteClient({ code }: { code: string }) {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [meId, setMeId] = useState<string>("");

  const loadQuote = useCallback(async (quoteId: string, access: Access) => {
    const r = await get(`/api/quotes/${quoteId}`);
    if (r.status === 200 && r.body?.quote) setView({ kind: "quote", access, quote: r.body.quote as Quote });
    else setView({ kind: "error", message: msgOf(r.body) });
    return r.status === 200 ? (r.body.quote as Quote) : null;
  }, []);

  const load = useCallback(async () => {
    if (!code) { setView({ kind: "invalid" }); return; }
    const r = await get(`/api/quotes/link/${code}`);
    if (r.status === 404) { setView({ kind: "invalid" }); return; }
    if (r.status === 403 && r.body?.code === "OTHER_ACCOUNT") { setView({ kind: "other" }); return; }
    if (r.status !== 200) { setView({ kind: "error", message: msgOf(r.body) }); return; }
    if (r.body.access === "preview" || !r.body.quoteId) { setView({ kind: "preview", preview: r.body.preview as Preview }); return; }
    const me = await get("/api/auth/me");
    if (typeof me.body?.id === "string") setMeId(me.body.id);
    await loadQuote(r.body.quoteId, r.body.access as Access);
  }, [code, loadQuote]);

  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);

  const business: Business | null = view.kind === "preview" ? view.preview.business : view.kind === "quote" ? view.quote.business : null;
  const brand = brandColor(business);
  const ink = inkOn(brand);

  return (
    <div className="qp" style={{ ["--brand" as string]: brand, ["--brand-ink" as string]: ink }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="qp-wrap">
        <AppBanner />
        {business && <Header business={business} />}
        {view.kind === "loading" && <div className="qp-card qp-muted">Loading your quote.</div>}
        {view.kind === "invalid" && <Message title="This quote link isn't valid" text="Check the link in your email, or open Messages in the Outsyde app." />}
        {view.kind === "other" && (
          <Message title="This quote isn't on this account" text="This quote was sent to another Outsyde account. Sign in with the email it was sent to.">
            <Link className="qp-btn" href={loginHref(code)}>Sign in with another account</Link>
          </Message>
        )}
        {view.kind === "error" && <Message title="We couldn't load this quote" text={view.message}><button className="qp-btn" onClick={() => void load()}>Try again</button></Message>}
        {view.kind === "preview" && <PreviewView preview={view.preview} code={code} />}
        {view.kind === "quote" && (
          <QuoteView quote={view.quote} access={view.access} meId={meId} refresh={() => loadQuote(view.quote.id, view.access)} />
        )}
      </div>
    </div>
  );
}

/* ---------- shell ---------- */

function AppBanner() {
  return (
    <div className="qp-banner">
      <span>Get the Outsyde app for quotes, chat and updates.</span>
      <span className="qp-stores"><a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">App Store</a><a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">Google Play</a></span>
    </div>
  );
}

function Header({ business }: { business: Business }) {
  const logo = safeImage(business.logoImage);
  const cover = safeImage(business.coverImage);
  const name = business.name || "Business";
  const initials = name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <header className="qp-head">
      {cover && <div className="qp-cover" style={{ backgroundImage: `url("${cover.replace(/"/g, "%22")}")` }} aria-hidden="true" />}
      <div className="qp-brand">
        {logo ? <img className="qp-logo" src={logo} alt="" /> : <div className="qp-logo qp-initials" aria-hidden="true">{initials}</div>}
        <div className="qp-bname">{name}</div>
      </div>
    </header>
  );
}

function Message({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="qp-card">
      <h1 className="qp-title">{title}</h1>
      <p className="qp-muted">{text}</p>
      {children}
    </div>
  );
}

function Lines({ preview }: { preview: Pick<Preview, "amounts" | "paymentMode"> }) {
  return (
    <div className="qp-lines">
      {payLines(preview.amounts, preview.paymentMode).map((l) => (
        <div key={l.label} className={`qp-line${l.total ? " qp-total" : ""}${l.muted ? " qp-muted" : ""}`}><span>{l.label}</span><span>{money(l.cents)}</span></div>
      ))}
    </div>
  );
}

function Summary({ q, details }: { q: Preview & { details?: string | null; extrasNote?: string | null }; details: boolean }) {
  const when = whenLine(q);
  return (
    <>
      <h1 className="qp-title">{q.title}</h1>
      {when && <div className="qp-muted">{when}</div>}
      {details && q.details && <p className="qp-text">{q.details}</p>}
      {details && q.extrasNote && <p className="qp-text qp-muted">{q.extrasNote}</p>}
    </>
  );
}

/* ---------- signed out ---------- */

function PreviewView({ preview, code }: { preview: Preview; code: string }) {
  const open = preview.status === "sent";
  return (
    <div className="qp-card">
      <span className="qp-pill">Quote</span>
      <Summary q={preview} details={false} />
      <Lines preview={preview} />
      {open ? (
        <>
          <Link className="qp-btn" href={loginHref(code)}>Sign in to pay</Link>
          <p className="qp-small">Sign in with the Outsyde account this quote was sent to. You earn Outsyde loyalty rewards points on what you pay.</p>
        </>
      ) : (
        <>
          <p className="qp-muted">{preview.status === "paid" ? "This quote is paid. Sign in to see your booking." : closedLine(preview.status)}</p>
          <Link className="qp-btn2" href={loginHref(code)}>Sign in</Link>
        </>
      )}
    </div>
  );
}

/* ---------- the quote ---------- */

function QuoteView({ quote: q, access, meId, refresh }: { quote: Quote; access: Access; meId: string; refresh: () => Promise<Quote | null> }) {
  const stage = stageOf(q);
  const isCustomer = access === "customer";
  const businessName = q.business?.name || q.businessName || "The business";

  // While a payment or a bank step settles at Stripe, ask the backend again every few seconds for up to 2 minutes.
  const [waiting, setWaiting] = useState<string>("");
  const pollUntil = useCallback(async (done: (fresh: Quote) => boolean, label: string) => {
    setWaiting(label);
    const until = Date.now() + 120_000;
    while (Date.now() < until) {
      const fresh = await refresh();
      if (fresh && done(fresh)) { setWaiting(""); return true; }
      await new Promise((r) => setTimeout(r, 2500));
    }
    setWaiting("");
    return false;
  }, [refresh]);

  useEffect(() => {
    if (stage !== "paying") return;
    const t = setTimeout(() => void pollUntil((f) => stageOf(f) !== "paying", "Your payment is being confirmed."), 0);
    return () => clearTimeout(t);
  }, [stage, pollUntil]);

  return (
    <>
      <div className="qp-card">
        <span className="qp-pill">{stage === "pay" ? "Quote" : stage === "closed" ? "Closed" : stage === "window" ? "Job complete" : stage === "reported" ? "Under review" : stage === "decided" ? "Reviewed" : stage === "complete" ? "Complete" : "Booked"}</span>
        <Summary q={q} details={true} />
        {(stage === "pay" || stage === "paying" || stage === "closed") && <Lines preview={q} />}
        {waiting && <p className="qp-note" role="status">{waiting}</p>}
        {stage === "closed" && <p className="qp-muted">{closedLine(q.status)}</p>}
        {stage === "pay" && isCustomer && <PayPanel q={q} onPaid={() => pollUntil((f) => f.status === "paid", "Your payment is being confirmed.")} onDeclined={refresh} />}
        {stage === "pay" && !isCustomer && <p className="qp-muted">Waiting for the customer to pay. Manage this quote in the Outsyde app.</p>}
        {stage !== "pay" && stage !== "paying" && stage !== "closed" && <BookedLines q={q} isCustomer={isCustomer} pollUntil={pollUntil} />}
      </div>
      {q.status === "paid" && q.extras.length > 0 && <ExtrasPanel q={q} isCustomer={isCustomer} refresh={refresh} />}
      {stage === "window" && isCustomer && <WindowPanel q={q} refresh={refresh} />}
      {stage === "reported" && <div className="qp-card"><h2 className="qp-h2">Outsyde is reviewing this job</h2><p className="qp-muted">{isCustomer ? "Thanks for telling us. We'll let you know what we decide." : "The customer reported a problem. Your payout for this job is paused while Outsyde reviews it."}</p></div>}
      {stage === "decided" && q.report && <div className="qp-card"><h2 className="qp-h2">Review done</h2><p className="qp-muted">{decidedLine(q.report, businessName)}</p></div>}
      {access !== "admin" && <NotesPanel q={q} meId={meId} businessName={businessName} />}
      {!isCustomer && access === "vendor" && <p className="qp-small qp-center">You&apos;re viewing this as the business. Send extras and mark the job complete in the Outsyde app.</p>}
    </>
  );
}

function BookedLines({ q, isCustomer, pollUntil }: { q: Quote; isCustomer: boolean; pollUntil: (done: (f: Quote) => boolean, label: string) => Promise<boolean> }) {
  const bal = balanceLine(q);
  const ex = extrasPaymentLine(q.extrasPayment);
  return (
    <div className="qp-stack">
      <div className="qp-line"><span>Quote total</span><span>{money(q.totalCents)}</span></div>
      {q.paymentMode === "deposit" && <div className="qp-line qp-muted"><span>Deposit paid, with its service fee</span><span>{money(q.amounts.payNowCents)}</span></div>}
      {q.paymentMode === "full" && <div className="qp-line qp-muted"><span>Paid, with the service fee</span><span>{money(q.amounts.payNowCents)}</span></div>}
      {bal && <ActionLine text={bal.text} action={isCustomer ? bal.action : undefined} q={q} onDone={() => pollUntil((f) => !balanceLine(f)?.action, "Your card is being confirmed.")} />}
      {ex && <ActionLine text={ex.text} action={isCustomer ? ex.action : undefined} q={q} onDone={() => pollUntil((f) => !extrasPaymentLine(f.extrasPayment)?.action, "Your card is being confirmed.")} />}
      {!isCustomer && ex?.action && <p className="qp-small">Extras unpaid. The customer has been asked to pay for them.</p>}
    </div>
  );
}

/* ---------- paying the quote ---------- */

function PayPanel({ q, onPaid, onDeclined }: { q: Quote; onPaid: () => void; onDeclined: () => Promise<Quote | null> }) {
  const [stripe, setStripe] = useState<Stripe | null | undefined>(undefined);
  const [secret, setSecret] = useState<string>("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  useEffect(() => { void stripeOnce().then(setStripe); }, []);

  // One payment per quote version: the backend returns the same unfinished payment when asked again.
  async function start() {
    setError(""); setStarting(true);
    const r = await post(`/api/quotes/${q.id}/pay`, { version: q.version });
    setStarting(false);
    if (r.status === 200 && typeof r.body?.clientSecret === "string") { setSecret(r.body.clientSecret); return; }
    if (r.body?.code === "QUOTE_CLOSED" && r.body?.status === "paid") { onPaid(); return; }
    setError(msgOf(r.body));
    if (r.body?.code === "QUOTE_CHANGED") void onDeclined();
  }
  async function decline() {
    setDeclining(true);
    const r = await post(`/api/quotes/${q.id}/decline`, {});
    setDeclining(false);
    if (r.status !== 200) setError(msgOf(r.body));
    await onDeclined();
  }

  if (stripe === null) return <p className="qp-err">Payments aren&apos;t available right now. Try again later.</p>;
  return (
    <div className="qp-stack">
      {!secret ? (
        <button className="qp-btn" onClick={() => void start()} disabled={starting || stripe === undefined}>{starting ? "Getting your payment ready" : `Continue to pay ${money(q.amounts.payNowCents)}`}</button>
      ) : (
        <Elements stripe={stripe ?? null} options={{ appearance }}>
          <CardPay secret={secret} amountCents={q.amounts.payNowCents} kind="pay" label={`Pay ${money(q.amounts.payNowCents)}`} onDone={onPaid} applePay />
        </Elements>
      )}
      {error && <p className="qp-err" role="alert">{error}</p>}
      <p className="qp-small">You earn Outsyde loyalty rewards points on what you pay. By paying, you agree to the <Link href="/terms">Terms</Link> and the <Link href="/refund-policy">Refund Policy</Link>.</p>
      {!declineOpen ? (
        <button className="qp-link" onClick={() => setDeclineOpen(true)}>Decline this quote</button>
      ) : (
        <div className="qp-row">
          <span className="qp-muted">Decline this quote?</span>
          <button className="qp-btn2" onClick={() => void decline()} disabled={declining}>Decline</button>
          <button className="qp-link" onClick={() => setDeclineOpen(false)}>Keep it</button>
        </div>
      )}
    </div>
  );
}

/**
 * The card field for one Stripe step: pay (charged now), hold (held on the card) or setup (the card is checked).
 * onDone runs once Stripe accepted it; the caller then waits for the backend to say so.
 */
function CardPay({ secret, kind, label, onDone, amountCents, applePay = false }: { secret: string; kind: IntentKind; label: string; onDone: () => void; amountCents?: number; applePay?: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cardError, setCardError] = useState("");
  const lock = useRef(false);

  async function settle(s: Stripe, r: { status?: string | null; errorCode?: string | null; errorMessage?: string | null; thrown?: boolean }) {
    let o = intentOutcome(kind, r);
    if (o.next === "check") {
      try {
        const st = kind === "setup" ? (await s.retrieveSetupIntent(secret)).setupIntent?.status : (await s.retrievePaymentIntent(secret)).paymentIntent?.status;
        o = intentOutcome(kind, { status: st ?? null });
      } catch { o = { next: "failed", message: GENERIC }; }
    }
    if (o.next === "done") onDone();
    else if (o.next === "failed") setError(o.message);
    else setError(GENERIC);
  }

  async function submit() {
    if (!stripe || !elements || lock.current) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    lock.current = true; setBusy(true); setError("");
    try {
      if (kind === "setup") {
        const r = await stripe.confirmCardSetup(secret, { payment_method: { card } }).catch(() => null);
        await settle(stripe, r ? { status: r.setupIntent?.status ?? (r.error as { setup_intent?: { status?: string } } | undefined)?.setup_intent?.status, errorCode: r.error?.code, errorMessage: r.error?.message } : { thrown: true });
      } else {
        const r: PaymentIntentResult | null = await stripe.confirmCardPayment(secret, { payment_method: { card } }).catch(() => null);
        await settle(stripe, r ? { status: r.paymentIntent?.status ?? (r.error as { payment_intent?: { status?: string } } | undefined)?.payment_intent?.status, errorCode: r.error?.code, errorMessage: r.error?.message } : { thrown: true });
      }
    } finally {
      lock.current = false; setBusy(false);
    }
  }

  return (
    <div className="qp-stack">
      {applePay && kind === "pay" && amountCents && amountCents > 0 && (
        <ApplePayBox secret={secret} amountCents={amountCents} busy={() => lock.current} onStart={() => { lock.current = true; setBusy(true); setError(""); }} onEnd={() => { lock.current = false; setBusy(false); }} onResult={settle} />
      )}
      <div className="qp-label" id="qp-card-label">Card</div>
      <div className="qp-cardbox" aria-labelledby="qp-card-label"><CardElement options={cardStyle} onChange={(e) => setCardError(e.error ? e.error.message : "")} /></div>
      {cardError && <p className="qp-err" role="alert">{cardError}</p>}
      {error && <p className="qp-err" role="alert">{error}</p>}
      <button className="qp-btn" onClick={() => void submit()} disabled={!stripe || !elements || busy}>{busy ? "Processing" : label}</button>
    </div>
  );
}

/** Apple Pay only (same as ticket checkout), in its own Elements group; takes no space where Apple Pay isn't available. */
function ApplePayBox(props: { secret: string; amountCents: number; busy: () => boolean; onStart: () => void; onEnd: () => void; onResult: (s: Stripe, r: { status?: string | null; errorCode?: string | null; errorMessage?: string | null; thrown?: boolean }) => Promise<void> }) {
  const parentStripe = useStripe();
  const [shown, setShown] = useState(false);
  return (
    <div style={shown ? { display: "flex", flexDirection: "column", gap: 10 } : { visibility: "hidden", height: 0, overflow: "hidden" }} aria-hidden={!shown}>
      <Elements stripe={parentStripe} options={{ mode: "payment", amount: props.amountCents, currency: "usd", appearance }}>
        <ApplePayButton {...props} onShown={setShown} />
      </Elements>
      <div className="qp-or">or pay with card</div>
    </div>
  );
}
function ApplePayButton({ secret, busy, onStart, onEnd, onResult, onShown }: { secret: string; busy: () => boolean; onStart: () => void; onEnd: () => void; onResult: (s: Stripe, r: { status?: string | null; errorCode?: string | null; errorMessage?: string | null; thrown?: boolean }) => Promise<void>; onShown: (v: boolean) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  return (
    <ExpressCheckoutElement
      options={{ paymentMethods: { applePay: "auto", googlePay: "never", link: "never", paypal: "never", amazonPay: "never", klarna: "never" }, buttonTheme: { applePay: "white" }, buttonType: { applePay: "buy" } }}
      onReady={(e) => onShown(!!e.availablePaymentMethods?.applePay)}
      onClick={(e) => { if (busy()) e.reject(); else e.resolve(); }}
      onConfirm={async (ev) => {
        if (!stripe || !elements || busy()) { ev.paymentFailed({ reason: "fail" }); return; }
        onStart();
        try {
          const { error: submitError } = await elements.submit();
          if (submitError) { ev.paymentFailed({ reason: "fail" }); await onResult(stripe, { errorMessage: submitError.message || "Apple Pay couldn't start. Try again or pay with card." }); return; }
          const r = await stripe.confirmPayment({ elements, clientSecret: secret, confirmParams: { return_url: window.location.href }, redirect: "if_required" }).catch(() => null);
          if (!r || r.error) ev.paymentFailed({ reason: "fail" });
          await onResult(stripe, r ? { status: r.paymentIntent?.status ?? (r.error as { payment_intent?: { status?: string } } | undefined)?.payment_intent?.status, errorCode: r.error?.code, errorMessage: r.error?.message } : { thrown: true });
        } finally { onEnd(); }
      }}
    />
  );
}

/** A balance or extras line with Update your card or Pay for extras. */
function ActionLine({ text, action, q, onDone }: { text: string; action?: Action; q: Quote; onDone: () => void }) {
  const [stripe, setStripe] = useState<Stripe | null | undefined>(undefined);
  const [step, setStep] = useState<{ secret: string; kind: IntentKind } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (action) void stripeOnce().then(setStripe); }, [action]);

  async function start() {
    if (!action) return;
    setBusy(true); setError("");
    const r = await post(`/api/quotes/${q.id}/${action.kind === "balance-card" ? "balance" : "extras"}/card`, {});
    setBusy(false);
    if (r.status === 200 && typeof r.body?.clientSecret === "string") setStep({ secret: r.body.clientSecret, kind: r.body.captureMethod === "automatic" ? "pay" : "hold" });
    else setError(msgOf(r.body));
  }
  return (
    <div className={action ? "qp-alert" : "qp-note"}>
      <p>{text}</p>
      {action && !step && <button className="qp-btn" onClick={() => void start()} disabled={busy || stripe === undefined}>{busy ? "Getting it ready" : action.label}</button>}
      {action && step && stripe && (
        <Elements stripe={stripe} options={{ appearance }}>
          <CardPay secret={step.secret} kind={step.kind} label={step.kind === "pay" ? "Pay now" : "Use this card"} onDone={() => { setStep(null); onDone(); }} />
        </Elements>
      )}
      {stripe === null && action && <p className="qp-err">Payments aren&apos;t available right now. Try again later.</p>}
      {error && <p className="qp-err" role="alert">{error}</p>}
    </div>
  );
}

/* ---------- extras ---------- */

function ExtrasPanel({ q, isCustomer, refresh }: { q: Quote; isCustomer: boolean; refresh: () => Promise<Quote | null> }) {
  return (
    <div className="qp-card">
      <h2 className="qp-h2">Extras</h2>
      {q.extras.map((x) => <ExtraRow key={x.id} q={q} x={x} isCustomer={isCustomer} refresh={refresh} />)}
    </div>
  );
}

function ExtraRow({ q, x, isCustomer, refresh }: { q: Quote; x: Extra; isCustomer: boolean; refresh: () => Promise<Quote | null> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [declined, setDeclined] = useState(false);
  const [step, setStep] = useState<{ secret: string; kind: IntentKind; newCard: boolean } | null>(null);
  const [stripe, setStripe] = useState<Stripe | null | undefined>(undefined);
  const open = isCustomer && x.canApprove;
  useEffect(() => { if (open) void stripeOnce().then(setStripe); }, [open]);

  async function approve(newCard = false) {
    setBusy(true); setError(""); setDeclined(false);
    const path = `/api/quotes/${q.id}/extras/${x.id}/approve`;
    let r = await post(path, newCard ? { newCard: true } : {});
    // A bank check (3D Secure) on the saved card: finish it here, then ask again.
    if (r.status === 200 && r.body?.status === "needs_action" && !newCard && stripe) {
      const s = stripe;
      const res = await s.handleNextAction({ clientSecret: r.body.clientSecret }).catch(() => null);
      if (res?.error) { setBusy(false); setError(res.error.message || "Your bank didn't confirm the card."); return; }
      r = await post(path, {});
    }
    setBusy(false);
    if (r.status === 200 && r.body?.status === "approved") { setStep(null); await refresh(); return; }
    if (r.status === 200 && r.body?.status === "needs_action" && newCard) {
      setStep({ secret: r.body.clientSecret, kind: r.body.intentType === "setup" ? "setup" : "hold", newCard: true });
      return;
    }
    if (r.status === 402) { setDeclined(true); setError(msgOf(r.body)); return; }
    setError(msgOf(r.body));
    await refresh();
  }
  async function decline() {
    setBusy(true); setError("");
    const r = await post(`/api/quotes/${q.id}/extras/${x.id}/decline`, {});
    setBusy(false);
    if (r.status !== 200) setError(msgOf(r.body));
    await refresh();
  }

  return (
    <div className="qp-extra">
      <div className="qp-line"><b>{x.description}</b><span>{money(x.totalCents)}</span></div>
      <div className="qp-small">{money(x.amountCents)} plus a service fee. {x.status === "approved" && q.extrasPayment?.status === "captured" ? "Approved and charged." : extraStatusLine(x)}</div>
      {open && !step && (
        <div className="qp-pair">
          <button className="qp-btn" onClick={() => void approve(false)} disabled={busy || stripe === undefined}>{busy ? "Checking your card" : "Approve"}</button>
          <button className="qp-btn2" onClick={() => void decline()} disabled={busy}>Decline</button>
        </div>
      )}
      {open && declined && !step && <button className="qp-link" onClick={() => void approve(true)} disabled={busy}>Use another card</button>}
      {open && step && stripe && (
        <Elements stripe={stripe} options={{ appearance }}>
          <CardPay secret={step.secret} kind={step.kind} label="Approve with this card" onDone={() => void approve(true)} />
        </Elements>
      )}
      {error && <p className="qp-err" role="alert">{error}</p>}
    </div>
  );
}

/* ---------- Confirm or Report ---------- */

function WindowPanel({ q, refresh }: { q: Quote; refresh: () => Promise<Quote | null> }) {
  const [now, setNow] = useState(() => Date.now());
  const [mode, setMode] = useState<"choose" | "report">("choose");
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);

  const charged = [q.balance?.status === "captured" ? `the balance, ${money(q.balance.capturedCents ?? q.balance.holdCents)}` : "", q.extrasPayment?.status === "captured" ? `extras, ${money(q.extrasPayment.capturedCents ?? q.extrasPayment.holdCents)}` : ""].filter(Boolean);

  async function confirm() {
    setBusy(true); setError("");
    const r = await post(`/api/quotes/${q.id}/confirm`, {});
    setBusy(false);
    if (r.status !== 200) setError(msgOf(r.body));
    await refresh();
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setError("");
    try {
      for (const f of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("folder", "requests");
        const res = await fetch("/api/vendor-dashboard/upload-image", { method: "POST", body: fd });
        const d = await res.json().catch(() => ({}));
        if (!res.ok || typeof d.url !== "string") throw new Error(typeof d.error === "string" ? d.error : "The photo couldn't be uploaded.");
        setPhotos((p) => [...p, d.url]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The photo couldn't be uploaded.");
    } finally {
      setUploading(false);
    }
  }
  async function report() {
    const problem = reportProblem(reason, photos.length);
    if (problem) { setError(problem); return; }
    setBusy(true); setError("");
    const r = await post(`/api/quotes/${q.id}/report`, { reason: reason.trim(), photos });
    setBusy(false);
    if (r.status !== 200) { setError(msgOf(r.body)); return; }
    await refresh();
  }

  return (
    <div className="qp-card">
      <h2 className="qp-h2">How did it go?</h2>
      <p className="qp-muted">{charged.length ? `We charged ${charged.join(" and ")}. ` : ""}If something went wrong, report a problem within 6 hours. Otherwise the business is paid.</p>
      <p className="qp-small">{windowLeft(q.window?.endsAt ?? null, now)}</p>
      {mode === "choose" ? (
        <div className="qp-stack">
          {q.window?.canConfirm && <button className="qp-btn" onClick={() => void confirm()} disabled={busy}>Confirm the job</button>}
          {q.window?.canReport && <button className="qp-btn2" onClick={() => setMode("report")} disabled={busy}>Report a problem</button>}
        </div>
      ) : (
        <div className="qp-stack">
          <label className="qp-label" htmlFor="qp-reason">What went wrong?</label>
          <textarea id="qp-reason" className="qp-input" rows={4} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="At least 10 characters" />
          <label className="qp-label" htmlFor="qp-photos">Photos, up to {MAX_PHOTOS}</label>
          <input id="qp-photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple disabled={uploading || photos.length >= MAX_PHOTOS} onChange={(e) => void upload(e.target.files)} />
          {photos.length > 0 && <div className="qp-thumbs">{photos.map((p) => <img key={p} src={p} alt="" />)}</div>}
          <button className="qp-btn" onClick={() => void report()} disabled={busy || uploading}>{busy ? "Sending" : "Send the report"}</button>
          <button className="qp-link" onClick={() => setMode("choose")} disabled={busy}>Back</button>
        </div>
      )}
      {error && <p className="qp-err" role="alert">{error}</p>}
    </div>
  );
}

/* ---------- notes ---------- */

function NotesPanel({ q, meId, businessName }: { q: Quote; meId: string; businessName: string }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const r = await get(`/api/quotes/${q.id}/notes`);
    if (r.status === 200 && Array.isArray(r.body?.messages)) setNotes((r.body.messages as Note[]).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  }, [q.id]);
  useEffect(() => { const first = setTimeout(() => void load(), 0); const t = setInterval(() => void load(), 20_000); return () => { clearTimeout(first); clearInterval(t); }; }, [load]);

  async function send() {
    const content = text.trim();
    if (!content) return;
    setBusy(true); setError("");
    const r = await post(`/api/quotes/${q.id}/notes`, { content });
    setBusy(false);
    if (r.status !== 200) { setError(msgOf(r.body)); return; }
    setText("");
    await load();
  }
  const other = meId && meId === q.customerId ? businessName : "The customer";
  return (
    <div className="qp-card">
      <h2 className="qp-h2">Notes with {meId === q.customerId ? businessName : "the customer"}</h2>
      <p className="qp-small">The same chat as Messages in the Outsyde app.</p>
      <div className="qp-notes" aria-live="polite">
        {notes === null && <p className="qp-small">Loading notes.</p>}
        {notes?.length === 0 && <p className="qp-small">No notes yet.</p>}
        {notes?.map((n) => n.kind === "text"
          ? <div key={n.id} className={`qp-bub${n.senderId === meId ? " qp-me" : ""}`}>{n.content || (n.mediaItems.length ? "Sent a photo. Open the app to see it." : "")}<span className="qp-time">{n.senderId === meId ? "You" : other}</span></div>
          : <div key={n.id} className="qp-sys">{n.content}</div>)}
      </div>
      <div className="qp-row">
        <label htmlFor="qp-note" className="qp-sr">Write a note</label>
        <input id="qp-note" className="qp-input" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="Write a note" onKeyDown={(e) => { if (e.key === "Enter") void send(); }} />
        <button className="qp-btn qp-send" onClick={() => void send()} disabled={busy || !text.trim()}>Send</button>
      </div>
      {error && <p className="qp-err" role="alert">{error}</p>}
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap');
.qp { min-height: 100vh; background: #0F0E12; color: #F2F0EA; font-family: Manrope, system-ui, sans-serif; font-size: 15px; line-height: 1.55; }
.qp-wrap { max-width: 560px; margin: 0 auto; padding: 16px max(16px, env(safe-area-inset-left, 0px)) 48px max(16px, env(safe-area-inset-right, 0px)); display: flex; flex-direction: column; gap: 14px; }
.qp-banner { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; background: #1B1A21; border: 1px solid #2A2831; border-radius: 12px; padding: 10px 12px; font-size: 13px; color: #B5B0BC; }
.qp-stores { display: flex; gap: 12px; }
.qp-stores a, .qp-small a { color: #F2F0EA; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
.qp-head { position: relative; border-radius: 16px; overflow: hidden; background: #17161B; border: 1px solid #2A2831; }
.qp-cover { height: 120px; background-size: cover; background-position: center; }
.qp-brand { display: flex; align-items: center; gap: 12px; padding: 14px; }
.qp-logo { width: 48px; height: 48px; border-radius: 12px; object-fit: cover; flex: none; }
.qp-initials { display: grid; place-items: center; background: var(--brand); color: var(--brand-ink); font-weight: 800; }
.qp-bname { font-weight: 800; font-size: 17px; min-width: 0; overflow-wrap: anywhere; }
.qp-card { background: #17161B; border: 1px solid #2A2831; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.qp-title { font-family: Fraunces, Georgia, serif; font-size: 26px; line-height: 1.15; margin: 0; overflow-wrap: anywhere; }
.qp-h2 { font-family: Fraunces, Georgia, serif; font-size: 20px; margin: 0; }
.qp-pill { align-self: flex-start; border-radius: 99px; padding: 2px 10px; font-size: 12px; font-weight: 800; background: transparent; color: #F2F0EA; border: 1px solid var(--brand); }
.qp-muted { color: #B5B0BC; margin: 0; }
.qp-text { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.qp-small { font-size: 12.5px; color: #9D98A5; margin: 0; }
.qp-center { text-align: center; }
.qp-lines, .qp-stack { display: flex; flex-direction: column; gap: 8px; }
.qp-line { display: flex; justify-content: space-between; gap: 12px; font-variant-numeric: tabular-nums; }
.qp-line > :first-child { min-width: 0; overflow-wrap: anywhere; }
.qp-total { font-weight: 800; font-size: 17px; border-top: 1px solid #2A2831; padding-top: 8px; }
.qp-btn, .qp-btn2 { display: flex; align-items: center; justify-content: center; min-height: 48px; border-radius: 12px; font: 800 15px Manrope, system-ui, sans-serif; cursor: pointer; text-decoration: none; padding: 0 16px; }
.qp-btn { background: var(--brand); color: var(--brand-ink); border: 0; }
.qp-btn2 { background: transparent; color: #F2F0EA; border: 1px solid #3A3842; }
.qp-btn:disabled, .qp-btn2:disabled { opacity: .55; cursor: default; }
.qp-btn:focus-visible, .qp-btn2:focus-visible, .qp-link:focus-visible, .qp-input:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.qp-link { background: none; border: 0; color: #B5B0BC; text-decoration: underline; cursor: pointer; font: inherit; align-self: flex-start; padding: 4px 0; }
.qp-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.qp-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.qp-err { color: #ff8a80; margin: 0; }
.qp-note { background: #1F1E25; border-radius: 12px; padding: 10px 12px; margin: 0; }
.qp-note p, .qp-alert p { margin: 0; }
.qp-alert { background: #2B1F14; border: 1px solid #5A3A1A; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.qp-label { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; font-weight: 800; color: #B5B0BC; }
.qp-cardbox { border: 1px solid #3A3842; border-radius: 12px; padding: 14px 12px; background: #121116; }
.qp-or { text-align: center; font-size: 12px; color: #9D98A5; }
.qp-extra { border-top: 1px solid #2A2831; padding-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.qp-input { flex: 1 1 200px; min-width: 0; background: #121116; color: #F2F0EA; border: 1px solid #3A3842; border-radius: 12px; padding: 12px; font: inherit; }
.qp-thumbs { display: flex; flex-wrap: wrap; gap: 8px; }
.qp-thumbs img { width: 64px; height: 64px; object-fit: cover; border-radius: 8px; }
.qp-notes { display: flex; flex-direction: column; gap: 8px; max-height: 360px; overflow-y: auto; }
.qp-bub { align-self: flex-start; max-width: 85%; background: #24222B; border-radius: 12px; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; overflow-wrap: anywhere; white-space: pre-wrap; }
.qp-me { align-self: flex-end; background: var(--brand); color: var(--brand-ink); }
.qp-time { font-size: 11px; opacity: .7; }
.qp-sys { align-self: center; font-size: 12px; color: #9D98A5; text-align: center; }
.qp-send { flex: none; }
.qp-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
`;
