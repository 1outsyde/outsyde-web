"use client";

// /plan-offer: the confirm page for a hidden plan offer (Plan Offers board 2.3).
// Screens follow the "Hidden Plan Offer Flow" canvas: 2a ConfirmCard, 2b ConfirmNoCard, 2c ConfirmAfterFree,
// 2d ConfirmEndsFree, 2e ConfirmSwitch, FreeOffer (claim here), and the messages PlanLate, InvoiceBilled,
// BankConfirm, OfferGone, Busy. Paid success continues on /subscription/success (artboard 4 Live).
//   · Signed out → /login?return=/plan-offer, straight back here.
//   · The app opens this page with ?token= (same handoff as /subscription/manage).
//   · Every screen has an X: back to the dashboard, the offer stays saved.

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  acceptLabel,
  confirmScreen,
  errorScreen,
  formatMoney,
  priceLine,
  type ConfirmScreen,
  type ErrorScreen,
  type PlanOffer,
} from "@/lib/plan-offer";
import { formatEtDate } from "@/lib/free-plan";
import { FONT_HREF, planOfferCss } from "@/components/plan-offer/planOfferCss";
import { CalendarIcon, CardIcon, CheckIcon, InfoIcon, LockIcon, SpinnerIcon, XIcon } from "@/components/plan-offer/icons";

type View =
  | { kind: "loading" }
  | { kind: "auth_error"; message: string }
  | { kind: "load_error" }
  | { kind: "confirm" }
  | { kind: "message"; screen: ErrorScreen | "bank"; url?: string }
  | { kind: "free_live" };

const CLOSE_HREF = "/vendor-dashboard";

function TopBar({ username, light = false }: { username: string | null; light?: boolean }) {
  return (
    <div className="po-top">
      <span className="po-top-brand">OUTSYDE</span>
      <span className="po-top-right">
        {username && <span className="po-top-user">@{username}</span>}
        <a className="po-x" href={CLOSE_HREF} aria-label="Close and decide later">
          <XIcon color={light ? "#111" : "#F5F0E6"} />
        </a>
      </span>
    </div>
  );
}

function PlanCard({ offer }: { offer: PlanOffer }) {
  return (
    <div className="po-plan">
      <div className="po-plan-row">
        <span className="po-display po-plan-name">{offer.planName}</span>
        <span className="po-chip">RESERVED FOR YOU</span>
      </div>
      <div className="po-price">
        <span className="po-display po-price-num">{formatMoney(offer.priceInCents)}</span>
        <span className="po-price-unit">a month</span>
      </div>
      <p className="po-plan-note">Everything in the app, up to {offer.maxStaff ?? 8} staff seats, and a price that stays locked while you keep this plan.</p>
    </div>
  );
}

function SavedCard({ offer, chargedOn, onChange, busy }: { offer: PlanOffer; chargedOn?: string; onChange: () => void; busy: boolean }) {
  return (
    <div className="po-card">
      <div className="po-card-icon"><CardIcon /></div>
      <div className="po-card-main">
        <span className="po-card-title">{offer.savedCard?.last4 ? `Card ending in ${offer.savedCard.last4}` : "Your saved card"}</span>
        <span className="po-card-sub">{chargedOn ? `Charged on ${chargedOn}` : "Saved on your account"}</span>
      </div>
      <button type="button" className="po-link" onClick={onChange} disabled={busy}>Change</button>
    </div>
  );
}

function MessageScreen({ screen, url, username, offer }: { screen: ErrorScreen | "bank"; url?: string; username: string | null; offer?: PlanOffer | null }) {
  const copy = {
    late: {
      bg: "#FBEBC9",
      icon: <CardIcon size={32} color="#6B4300" />,
      title: "Pay your current plan first",
      lead: `Your ${offer?.currentPlanName ?? "current plan"} payment${offer?.businessName ? ` for ${offer.businessName}` : ""} is late. Pay it from Manage Plan, then come back to accept this plan.`,
      noteTitle: "Your offer is saved",
      note: "It stays here and in the Outsyde app until you accept it. We do this so you're never charged twice for the same month.",
      primary: { label: "Go to Manage Plan", href: "/subscription/manage" },
    },
    invoice: {
      bg: "#E3EFE8",
      icon: <CalendarIcon size={32} />,
      title: "We'll switch this one for you",
      lead: "Your plan is billed by invoice, so it can't be switched here. Email info@goutsyde.com and we'll switch it for you.",
      noteTitle: "Your offer is saved",
      note: "Nothing was charged and your current plan hasn't changed.",
      primary: { label: "Email Outsyde", href: "mailto:info@goutsyde.com" },
    },
    bank: {
      bg: "#E3EFE8",
      icon: <LockIcon size={32} color="#1A3C34" />,
      title: "Your bank wants to confirm",
      lead: `Your bank asked you to confirm the ${offer?.dueTodayCents ? `${formatMoney(offer.dueTodayCents)} ` : ""}payment. It only takes a moment on Stripe's secure page.`,
      noteTitle: "Nothing changes until it's confirmed",
      note: "Your current plan stays as it is. As soon as the payment is confirmed you're on the new plan.",
      primary: { label: "Confirm payment", href: url ?? "/subscription/manage" },
    },
    gone: {
      bg: "#ECE8DE",
      icon: <InfoIcon size={32} color="#55524A" />,
      title: "This offer is no longer available",
      lead: "It was withdrawn, or it was already accepted on this account. Nothing was charged.",
      noteTitle: "Already accepted it?",
      note: "You'll see your plan under Manage Plan. Questions? Email us at info@goutsyde.com.",
      primary: { label: "Open Manage Plan", href: "/subscription/manage" },
    },
    busy: {
      bg: "#E3EFE8",
      icon: <SpinnerIcon />,
      title: "Your plan is being set up",
      lead: "Give it a moment, then check again.",
      noteTitle: "You won't be charged twice",
      note: "Tapping again doesn't start a second payment.",
      primary: { label: "Check again", href: "/plan-offer" },
    },
  }[screen];

  return (
    <div className="po po-page">
      <TopBar username={username} />
      <div className="po-body" style={{ paddingTop: 40, gap: 20 }}>
        <div className="po-badge-icon" style={{ background: copy.bg }}>{copy.icon}</div>
        <h1 className="po-display po-h1">{copy.title}</h1>
        <p className="po-lead">{copy.lead}</p>
        <div className="po-note po-note-white">
          <span className="po-note-text"><span className="po-note-title">{copy.noteTitle}</span>{copy.note}</span>
        </div>
        <div className="po-spacer" />
        <a className="po-btn po-btn-black" href={copy.primary.href}>
          {screen === "bank" && <LockIcon />}
          {copy.primary.label}
        </a>
        <a className="po-btn po-btn-ghost" href={CLOSE_HREF}>{screen === "bank" ? "Not now" : "Close"}</a>
      </div>
    </div>
  );
}

function PlanOfferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [offer, setOffer] = useState<PlanOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      // The app hands over its sign in once; the cookie carries it from then on.
      const set = await fetch("/api/subscription/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: urlToken }),
      }).catch(() => null);
      if (!set || !set.ok) {
        setView({ kind: "auth_error", message: "We couldn't sign you in from the app. Please sign in to continue." });
        return;
      }
      setAuthToken(urlToken);
      // Keep the sign in out of the address bar and history once the cookie holds it.
      try {
        window.history.replaceState(null, "", "/plan-offer");
      } catch {
        // harmless if the browser refuses
      }
    }
    const res = await fetch("/api/plan-offer", { cache: "no-store", headers: urlToken ? { "x-auth-token": urlToken } : {} }).catch(() => null);
    if (!res) {
      setView({ kind: "load_error" });
      return;
    }
    if (res.status === 401) {
      router.replace(`/login?return=${encodeURIComponent("/plan-offer")}`);
      return;
    }
    if (!res.ok) {
      setView({ kind: "load_error" });
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { offer?: PlanOffer | null };
    const o = data.offer ?? null;
    setOffer(o);
    const screen = confirmScreen(o);
    if (screen === "late" || screen === "invoice" || screen === "gone") setView({ kind: "message", screen });
    else setView({ kind: "confirm" });
  }, [router, searchParams]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  async function accept(useCheckout = false) {
    if (!offer || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/plan-offer/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { "x-auth-token": authToken } : {}) },
        body: JSON.stringify({ offerId: offer.id, ...(useCheckout ? { useCheckout: true } : {}) }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        accepted?: boolean;
        checkoutUrl?: string;
        pendingPayment?: boolean;
        url?: string;
        error?: { code?: string; message?: string } | string;
      };
      if (res.status === 401) {
        router.replace(`/login?return=${encodeURIComponent("/plan-offer")}`);
        return;
      }
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (res.ok && data.pendingPayment) {
        setView({ kind: "message", screen: "bank", url: data.url });
        return;
      }
      if (res.ok && data.accepted) {
        if (offer.plan === "free") setView({ kind: "free_live" });
        else {
          const q = new URLSearchParams({ offer: "1", plan: offer.planName });
          if (offer.outcome === "start_paid_after_free" && offer.billingStartsAt) q.set("starts", offer.billingStartsAt);
          router.replace(`/subscription/success?${q.toString()}`);
        }
        return;
      }
      const code = typeof data.error === "object" ? data.error?.code : undefined;
      const message = typeof data.error === "object" ? data.error?.message : data.error;
      const es = errorScreen(res.status, code);
      if (es) {
        setView({ kind: "message", screen: es });
        return;
      }
      setError(message || "Something went wrong. Please try again in a moment.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const styles = (
    <>
      <link rel="stylesheet" href={FONT_HREF} precedence="default" />
      <style dangerouslySetInnerHTML={{ __html: planOfferCss }} />
    </>
  );

  if (view.kind === "loading") {
    return <>{styles}<div className="po po-page"><TopBar username={null} /><div className="po-body"><p className="po-lead">Loading your offer…</p></div></div></>;
  }
  if (view.kind === "auth_error") {
    return (
      <>{styles}
        <div className="po po-page"><TopBar username={null} />
          <div className="po-body">
            <p className="po-err" role="alert">{view.message}</p>
            <a className="po-btn po-btn-black" href={`/login?return=${encodeURIComponent("/plan-offer")}`}>Sign in</a>
          </div>
        </div>
      </>
    );
  }
  if (view.kind === "load_error") {
    return (
      <>{styles}
        <div className="po po-page"><TopBar username={null} />
          <div className="po-body">
            <p className="po-err" role="alert">We couldn&rsquo;t load your offer right now. Please try again.</p>
            <button type="button" className="po-btn po-btn-black" onClick={() => { setView({ kind: "loading" }); void load(); }}>Try again</button>
            <a className="po-btn po-btn-ghost" href={CLOSE_HREF}>Close</a>
          </div>
        </div>
      </>
    );
  }
  if (view.kind === "message") {
    return <>{styles}<MessageScreen screen={view.screen} url={view.url} username={offer?.username ?? null} offer={offer} /></>;
  }
  if (!offer) return <>{styles}<MessageScreen screen="gone" username={null} /></>;

  if (view.kind === "free_live") {
    return (
      <>{styles}
        <div className="po po-dark">
          <div className="po-body">
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <a className="po-x" href={CLOSE_HREF} aria-label="Close"><XIcon color="#F5F0E6" /></a>
            </div>
            <div className="po-badge-icon" style={{ background: "#E8B930", width: 76, height: 76, borderRadius: 38 }}><CheckIcon size={40} color="#000" /></div>
            <h1 className="po-display po-dark-h">Your free plan is active</h1>
            <p className="po-dark-p">{offer.permanent || !offer.freeExpiresAt ? "It has no end date." : `${priceLine(offer)}.`} You&rsquo;ll find it anytime under Manage Plan.</p>
            <div className="po-dark-card">
              <p className="po-dark-eyebrow">ONE STEP LEFT</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Set up Stripe payouts</p>
              <p className="po-dark-p" style={{ fontSize: 14 }}>If you haven&rsquo;t yet, connect Stripe so the money from your bookings and sales is sent to you.</p>
            </div>
            <div className="po-spacer" />
            <a className="po-btn po-btn-gold" href="/finish">Set up payouts</a>
            <a className="po-btn po-btn-ghost" href={CLOSE_HREF}>Do this later</a>
          </div>
        </div>
      </>
    );
  }

  const screen: ConfirmScreen = confirmScreen(offer);
  const due = formatMoney(offer.dueTodayCents);
  const billingDay = offer.billingStartsAt ? formatEtDate(offer.billingStartsAt) : "";

  if (screen === "free") {
    return (
      <>{styles}
        <div className="po po-page">
          <TopBar username={offer.username} />
          <div className="po-body">
            <span className="po-tag po-tag-gold">YOU WON</span>
            <h1 className="po-display po-h1">Your free Outsyde plan</h1>
            <p className="po-sub">For {offer.businessName}</p>
            <div className="po-sheet-card">
              <div className="po-price">
                <span className="po-display po-sheet-price">Free</span>
                <span style={{ fontSize: 15, color: "#555" }}>{offer.permanent || !offer.freeExpiresAt ? "with no end date" : `until ${formatEtDate(offer.freeExpiresAt)}`}</span>
              </div>
              <div className="po-checks">
                {["Growth plan features", "Customers can book and buy from you", "Nothing to pay for the plan"].map((t) => (
                  <div key={t} className="po-check"><CheckIcon />{t}</div>
                ))}
              </div>
            </div>
            {offer.outcome === "replace_paid_with_free" && (
              <div className="po-note po-note-amber">
                <InfoIcon />
                <span className="po-note-text"><span className="po-note-title">Your paid plan ends today</span>{offer.currentPlanName ? `${offer.currentPlanName} is` : "Your paid plan is"} cancelled when you claim, and the free plan starts right away. Unused paid time isn&rsquo;t refunded.</span>
              </div>
            )}
            {error && <p className="po-err" role="alert">{error}</p>}
            <div className="po-spacer" />
            <button type="button" className="po-btn po-btn-black" onClick={() => accept()} disabled={busy}>{busy ? "Claiming…" : acceptLabel(screen, offer)}</button>
            <a className="po-btn po-btn-plain" href={CLOSE_HREF}>Not now</a>
            <p className="po-fine">One tap and it&rsquo;s active.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>{styles}
      <div className="po po-page">
        <TopBar username={offer.username} />
        <div className="po-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p className="po-step">{screen === "nocard" ? "STEP 1 OF 2" : "STEP 1 OF 1"}</p>
            <h1 className="po-display po-h1">{screen === "switch" ? "Switch your plan" : "Confirm your plan"}</h1>
            <p className="po-sub">For {offer.businessName}</p>
          </div>

          <PlanCard offer={offer} />

          {screen === "after_free" && (
            <div className="po-note po-note-green">
              <CalendarIcon />
              <span className="po-note-text"><span className="po-note-title">Your Free plan keeps going</span>It runs until {billingDay}. {offer.planName} billing starts that day, so nothing is charged today.</span>
            </div>
          )}
          {screen === "ends_free" && (
            <div className="po-note po-note-amber">
              <InfoIcon />
              <span className="po-note-text"><span className="po-note-title">Your Free plan ends today</span>Your Free plan has no end date, so {offer.planName} starts the moment you confirm and replaces it.</span>
            </div>
          )}
          {screen === "switch" && (
            <div className="po-note po-note-amber">
              <InfoIcon />
              <span className="po-note-text"><span className="po-note-title">How the switch works</span>{offer.currentPlanName ?? "Your current plan"} ends today. You&rsquo;re charged the full {due} now and your billing date restarts today. There&rsquo;s no credit for the unused time on {offer.currentPlanName ?? "your current plan"}.</span>
            </div>
          )}

          {screen === "switch" ? (
            <div className="po-card">
              <div className="po-card-icon"><CardIcon /></div>
              <div className="po-card-main">
                <span className="po-card-title">The card on your current plan</span>
                <span className="po-card-sub">Change it from Manage Plan</span>
              </div>
            </div>
          ) : offer.savedCard ? (
            <SavedCard offer={offer} chargedOn={screen === "after_free" ? billingDay : undefined} onChange={() => accept(true)} busy={busy} />
          ) : (
            <div className="po-card po-card-dashed">
              <CardIcon size={26} color="#1A3C34" />
              <div className="po-card-main">
                <span className="po-card-title">No card on file yet</span>
                <span className="po-card-sub">Next you&rsquo;ll add one on a secure checkout page. It stays saved for renewals.</span>
              </div>
            </div>
          )}

          <div className="po-due">
            <div className="po-due-row"><span>Due today</span><span className="po-due-strong">{due || "$0.00"}</span></div>
            {screen === "after_free" && <div className="po-due-row" style={{ color: "#3A3A3A" }}><span>On {billingDay}</span><span>{formatMoney(offer.priceInCents)}</span></div>}
          </div>

          {error && <p className="po-err" role="alert">{error}</p>}
          <div className="po-spacer" />
          <button type="button" className="po-btn po-btn-black" onClick={() => accept()} disabled={busy}>
            {screen === "nocard" && <LockIcon />}
            {busy ? "Working…" : offer.savedCard || screen === "switch" ? acceptLabel(screen, offer) : screen === "after_free" ? "Add card and confirm" : acceptLabel("nocard", offer)}
          </button>
          <p className="po-fine">
            {screen === "after_free"
              ? `Your card is saved now and charged ${formatMoney(offer.priceInCents)} on ${billingDay}, then every month. Cancel anytime from Manage Plan. If you switch to another plan later, this price can't be brought back.`
              : screen === "ends_free"
                ? "Renews monthly. Cancel anytime from Manage Plan. If you'd rather keep your Free plan, close this page and nothing changes."
                : screen === "switch"
                  ? "Renews monthly from today. If you switch to another plan later, this price can't be brought back."
                  : "Renews monthly. Cancel anytime from Manage Plan. If you switch to another plan later, this price can't be brought back."}
          </p>
        </div>
      </div>
    </>
  );
}

export default function PlanOfferPage() {
  return (
    <Suspense fallback={null}>
      <PlanOfferContent />
    </Suspense>
  );
}
