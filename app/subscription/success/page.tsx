"use client";

// app/subscription/success/page.tsx
// Shown after Stripe Checkout completes (every plan checkout, and plan offers) and after a one tap offer accept.
// Artboard "4. Plan active" on the Hidden Plan Offer Flow canvas.
//
// Access the second it's paid (Plan Offers board 2.5): Stripe returns here with ?session_id=cs_...; the page
// asks the backend to check that checkout and activate now (POST /api/subscription/reconcile) in case Stripe's
// webhook hasn't landed, then checks /api/subscription/status every 2 seconds for up to 20 seconds.
// Without session_id (the old /vendor/dashboard return drops the query) it still polls the status.
//
// Deep link: "Back to the Outsyde app" sets window.location.href = "outsyde://dashboard"; if the browser is
// still visible after 2 seconds the button is replaced with a plain message.

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { isPlanLive } from "@/lib/subscription-state";
import { formatEtDate } from "@/lib/free-plan";
import { FONT_HREF, planOfferCss } from "@/components/plan-offer/planOfferCss";
import { CheckIcon, SpinnerIcon, XIcon } from "@/components/plan-offer/icons";

interface CurrentSubscription {
  id: string;
  tierId: string;
  tierName: string;
  tierDisplayName: string;
  priceInCents: number;
  status: string;
}

const POLL_MS = 2000;
const POLL_TRIES = 10;
const SESSION_RE = /^cs_[A-Za-z0-9_]+$/;

function SuccessContent() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan") ?? "";
  const sessionParam = searchParams.get("session_id") ?? "";
  const sessionId = SESSION_RE.test(sessionParam) ? sessionParam : "";
  // Plan offers pass the offered plan, and its billing start when it follows a dated Free plan.
  const fromOffer = searchParams.get("offer") === "1";
  const startsParam = searchParams.get("starts") ?? "";
  const startsDate = startsParam && !Number.isNaN(Date.parse(startsParam)) ? formatEtDate(startsParam) : "";

  const [confirming, setConfirming] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [sub, setSub] = useState<CurrentSubscription | null>(null);

  // deep-link state: idle → tapped → failed (stayed in browser > 2 s)
  const [deepLinkState, setDeepLinkState] = useState<"idle" | "tapped" | "failed">("idle");

  useEffect(() => {
    let cancelled = false;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    async function reconcile() {
      if (!sessionId) return;
      await fetch("/api/subscription/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => null);
    }

    async function readStatus(): Promise<"live" | "late" | "pending" | "signed_out" | "error"> {
      const res = await fetch("/api/subscription/status", { cache: "no-store" }).catch(() => null);
      if (!res) return "error";
      if (res.status === 401) return "signed_out";
      if (!res.ok) return "error";
      const data = (await res.json().catch(() => ({}))) as { subscription?: CurrentSubscription };
      const subscription = data.subscription ?? null;
      if (!cancelled) setSub(subscription);
      if (subscription && isPlanLive(subscription.status)) return "live";
      if (subscription && (subscription.status === "past_due" || subscription.status === "unpaid")) return "late";
      return "pending";
    }

    async function confirmPlan() {
      await reconcile();
      let last: Awaited<ReturnType<typeof readStatus>> = "pending";
      for (let i = 0; i < POLL_TRIES && !cancelled; i++) {
        last = await readStatus();
        // A passing error (network, 5xx) is tried again like pending; only the last answer counts.
        if (last !== "pending" && last !== "error") break;
        // Ask the backend again halfway through, in case the checkout finished after the first check.
        if (i === Math.floor(POLL_TRIES / 2)) await reconcile();
        await wait(POLL_MS);
      }
      if (cancelled) return;
      if (last === "live") setConfirmed(true);
      else if (last === "signed_out") setConfirmError("Your session ended. Return to the app, or sign in again, and your plan will be there.");
      else if (last === "late") setConfirmError("Your payment didn't go through yet. Open Manage Plan to update your payment.");
      else if (last === "error") setConfirmError("We couldn't check your plan right now. Refresh this page in a moment.");
      else setConfirmError("Your plan isn't active yet. Refresh this page in a moment.");
      setConfirming(false);
    }

    confirmPlan();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  function handleReturnToApp() {
    setDeepLinkState("tapped");
    window.location.href = "outsyde://dashboard";

    // If the browser is still visible after 2 s the deep link didn't fire
    const timer = setTimeout(() => {
      setDeepLinkState("failed");
    }, 2000);

    // If the page hides (app opened), clear the timer so we don't flip state
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        clearTimeout(timer);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  const displayName =
    (fromOffer && planParam) ||
    sub?.tierDisplayName ||
    sub?.tierName ||
    (planParam ? decodeURIComponent(planParam) : "");

  return (
    <>
      <link rel="stylesheet" href={FONT_HREF} precedence="default" />
      <style dangerouslySetInnerHTML={{ __html: planOfferCss }} />
      <div className="po po-dark">
        <div className="po-body">
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -24 }}>
            <a className="po-x" href="/vendor-dashboard" aria-label="Close"><XIcon color="#F5F0E6" /></a>
          </div>

          {confirming && (
            <>
              <div className="po-badge-icon" style={{ background: "#1A1A1A" }}><SpinnerIcon color="#E8B930" /></div>
              <h1 className="po-display po-dark-h">Confirming your plan</h1>
              <p className="po-dark-p">This only takes a moment.</p>
            </>
          )}

          {!confirming && confirmError && (
            <>
              <h1 className="po-display po-dark-h">Almost there</h1>
              <p className="po-dark-p" role="alert">{confirmError}</p>
              <div className="po-spacer" />
              <a className="po-btn po-btn-gold" href="/subscription/manage">Open Manage Plan</a>
              <a className="po-btn po-btn-ghost" href="/subscription">Back to plans</a>
            </>
          )}

          {!confirming && confirmed && (
            <>
              <div className="po-badge-icon" style={{ background: "#E8B930", width: 76, height: 76, borderRadius: 38 }}><CheckIcon size={40} color="#000" /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h1 className="po-display po-dark-h">{displayName ? <>You&rsquo;re on the {displayName} plan</> : "Your plan is active"}</h1>
                <p className="po-dark-p">
                  {startsDate
                    ? <>Your free plan runs until {startsDate}. Billing starts then, and nothing is charged before.</>
                    : <>You&rsquo;re all set. We emailed you the details.</>}
                </p>
              </div>
              <div className="po-dark-card">
                <p className="po-dark-eyebrow">FINISH SETTING UP</p>
                <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 15 }}><CheckIcon color="#E8B930" />Plan chosen</div>
                <div style={{ fontSize: 15, color: "#CFC6B4" }}>Set up payouts so customers&rsquo; payments reach you</div>
              </div>
              <div className="po-spacer" />
              {/* Next setup step on the web (payouts, username). Primary, so a desktop visitor is never
                  left with only an app button. */}
              <a className="po-btn po-btn-gold" href="/finish">Continue setup</a>

              {deepLinkState === "idle" && (
                <button type="button" onClick={handleReturnToApp} className="po-btn po-btn-ghost">
                  Back to the Outsyde app
                </button>
              )}
              {deepLinkState === "tapped" && <p className="po-dark-p" style={{ textAlign: "center" }}>Opening the app…</p>}
              {deepLinkState === "failed" && (
                <div className="po-dark-card" style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Return to the Outsyde app on your device</p>
                  <p className="po-dark-p" style={{ fontSize: 13 }}>You can close this tab.</p>
                </div>
              )}

              <a href="/subscription/manage" className="po-fine" style={{ color: "#B5AC98" }}>Manage your subscription</a>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SuccessContent />
    </Suspense>
  );
}
