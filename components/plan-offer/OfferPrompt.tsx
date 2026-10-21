"use client";

// Hidden plan offer popup (artboards "1. App: offer popup" / "1. App: free plan popup") and banner
// (artboard "If he taps Not now: banner stays"), mounted once in the Navbar for a signed-in business owner.
//   · The popup shows once per visit while an offer is pending; Not now or X turns it into the banner.
//   · The banner's X hides it until the next visit. Both come back until the offer is accepted or withdrawn.
//   · Grandfathered: "Accept plan" opens /plan-offer. Free: "Claim free plan" accepts right here.
//   · Never on the admin, login, plan, checkout or shop pages (shouldShowOfferPrompt).

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  bannerHiddenKey,
  bannerText,
  errorScreen,
  formatMoney,
  popupSeenKey,
  priceLine,
  shouldShowOfferPrompt,
  type PlanOffer,
} from "@/lib/plan-offer";
import { FONT_HREF, planOfferCss } from "./planOfferCss";
import { CheckIcon, ChevronRight, XIcon } from "./icons";

function readFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setFlag(key: string): void {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // private window: the popup may show again on the next page, which is harmless
  }
}

interface Props {
  /** Signed-in business owner (Navbar decides). */
  enabled: boolean;
  /** Stripe payouts finished (for the "Set up payouts" step after a free claim). */
  payoutsReady: boolean;
  /** Tells the Navbar the popup is open (or the offer check is still running) so the payouts popup waits. */
  onPopupOpenChange: (open: boolean) => void;
  /** "Do this later" after a free claim: the payouts popup should not ask again this visit. */
  onPayoutsDeferred: () => void;
}

type Mode = "hidden" | "popup" | "banner" | "free_done";

export default function OfferPrompt({ enabled, payoutsReady, onPopupOpenChange, onPayoutsDeferred }: Props) {
  const pathname = usePathname();
  const allowedHere = shouldShowOfferPrompt(pathname);
  const [offer, setOffer] = useState<PlanOffer | null>(null);
  const [mode, setMode] = useState<Mode>("hidden");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetch("/api/plan-offer", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { offer?: PlanOffer | null } | null) => {
        if (!active) return;
        setChecked(true);
        const o = d?.offer ?? null;
        setOffer(o);
        if (!o) return setMode("hidden");
        if (!readFlag(popupSeenKey(o.id))) setMode("popup");
        else setMode(readFlag(bannerHiddenKey(o.id)) ? "hidden" : "banner");
      })
      .catch(() => {
        // no offer shown when the check fails
        if (active) setChecked(true);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  const popupVisible = allowedHere && (mode === "popup" || mode === "free_done");
  // While the offer check runs, hold the payouts popup back too, so it never flashes and then gets replaced.
  const holdOthers = enabled && allowedHere && (!checked || popupVisible);
  useEffect(() => {
    onPopupOpenChange(holdOthers);
  }, [holdOthers, onPopupOpenChange]);

  // Keyboard: focus the close button when a popup opens; Escape acts like Not now / Close.
  useEffect(() => {
    if (!popupVisible) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (mode === "popup") {
        if (offer) setFlag(popupSeenKey(offer.id));
        setMode("banner");
      } else {
        setMode("hidden");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [popupVisible, mode, offer]);

  if (!enabled || !offer || !allowedHere || mode === "hidden") return null;

  function notNow() {
    if (!offer) return;
    setFlag(popupSeenKey(offer.id));
    setMode("banner");
  }

  function hideBanner() {
    if (!offer) return;
    setFlag(bannerHiddenKey(offer.id));
    setMode("hidden");
  }

  function openPopup() {
    setError("");
    setMode("popup");
  }

  async function claimFree() {
    if (!offer || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/plan-offer/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { accepted?: boolean; error?: { code?: string; message?: string } | string };
      if (res.ok && data.accepted) {
        setFlag(popupSeenKey(offer.id));
        setMode("free_done");
        return;
      }
      const code = typeof data.error === "object" ? data.error?.code : undefined;
      const msg = typeof data.error === "object" ? data.error?.message : data.error;
      if (errorScreen(res.status, code) === "gone") {
        setOffer(null);
        setMode("hidden");
        return;
      }
      setError(msg || "Something went wrong. Please try again in a moment.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const isFree = offer.plan === "free";
  // A free offer that replaces a paid plan cancels it: never in one tap here, the confirm page explains it.
  const freeReplacesPaid = isFree && offer.outcome === "replace_paid_with_free";
  const banner = bannerText(offer);

  return (
    <>
      <link rel="stylesheet" href={FONT_HREF} precedence="default" />
      <style dangerouslySetInnerHTML={{ __html: planOfferCss }} />

      {mode === "banner" && (
        <div className="po po-banner" role="region" aria-label="Plan offer">
          <button type="button" className="po-banner-main" onClick={openPopup}>
            <span>
              <span className="po-banner-title">{banner.title}</span>
              <span className="po-banner-body">{banner.body}</span>
            </span>
            <ChevronRight />
          </button>
          <button type="button" className="po-x" style={{ marginRight: 6 }} aria-label="Hide until your next visit" onClick={hideBanner}>
            <XIcon size={18} color="#000" />
          </button>
        </div>
      )}

      {mode === "popup" && (
        <div className="po po-overlay" role="dialog" aria-modal="true" aria-labelledby="po-popup-title">
          <div className="po-sheet">
            <button ref={closeRef} type="button" className="po-x po-sheet-x" aria-label="Close" onClick={notNow}>
              <XIcon size={18} color="#111" />
            </button>
            <div className="po-grip" />
            <span className={`po-tag ${isFree ? "po-tag-gold" : "po-tag-green"}`}>{isFree ? "YOU WON" : "AN INVITATION FROM OUTSYDE"}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <h2 id="po-popup-title" className="po-display po-sheet-h">
                {isFree ? "Your free Outsyde plan" : `Your ${offer.planName} plan is ready`}
              </h2>
              <p className="po-lead">
                {isFree
                  ? "Outsyde is covering your subscription. No card needed."
                  : `We saved a founding price for ${offer.businessName}. New businesses can't get this plan.`}
              </p>
            </div>
            <div className="po-sheet-card">
              <div className="po-price">
                <span className="po-display po-sheet-price">{isFree ? "Free" : formatMoney(offer.priceInCents)}</span>
                <span style={{ fontSize: 15, color: "#555" }}>
                  {isFree ? (offer.permanent || !offer.freeExpiresAt ? "with no end date" : priceLine(offer).replace("Free ", "")) : "a month"}
                </span>
              </div>
              <div className="po-checks">
                {(isFree
                  ? ["Growth plan features", "Customers can book and buy from you", "Nothing to pay for the plan"]
                  : ["Everything in the app, including all analytics", `Up to ${offer.maxStaff ?? 8} staff seats`, "Your price stays locked while you keep it"]
                ).map((t) => (
                  <div key={t} className="po-check"><CheckIcon />{t}</div>
                ))}
              </div>
            </div>
            {error && <p className="po-err" role="alert">{error}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {isFree && !freeReplacesPaid ? (
                <button type="button" className="po-btn po-btn-black" onClick={claimFree} disabled={busy}>
                  {busy ? "Claiming…" : "Claim free plan"}
                </button>
              ) : (
                <a className="po-btn po-btn-black" href="/plan-offer" onClick={() => setFlag(popupSeenKey(offer.id))}>{freeReplacesPaid ? "Review and claim" : "Accept plan"}</a>
              )}
              <button type="button" className="po-btn po-btn-plain" onClick={notNow}>Not now</button>
            </div>
            <p className="po-fine">
              {freeReplacesPaid
                ? "Your current paid plan ends when you claim. Review it on the next page."
                : isFree ? "One tap and it's active. It happens right here." : "You'll confirm on the next page. Nothing is charged until you confirm."}
            </p>
          </div>
        </div>
      )}

      {mode === "free_done" && (
        <div className="po po-overlay" role="dialog" aria-modal="true" aria-labelledby="po-free-done">
          <div className="po-sheet" style={{ background: "#000", color: "#F5F0E6" }}>
            <button ref={closeRef} type="button" className="po-x po-sheet-x" style={{ background: "#1A1A1A" }} aria-label="Close" onClick={() => setMode("hidden")}>
              <XIcon size={18} color="#F5F0E6" />
            </button>
            <div className="po-badge-icon" style={{ background: "#E8B930", width: 76, height: 76, borderRadius: 38 }}>
              <CheckIcon size={40} color="#000" />
            </div>
            <h2 id="po-free-done" className="po-display po-dark-h">Your free plan is active</h2>
            <p className="po-dark-p">
              {offer.permanent || !offer.freeExpiresAt ? "It has no end date." : `${priceLine(offer)}.`} You&rsquo;ll find it anytime under Manage Plan.
            </p>
            {!payoutsReady && (
              <div className="po-dark-card">
                <p className="po-dark-eyebrow">ONE STEP LEFT</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Set up Stripe payouts</p>
                <p className="po-dark-p" style={{ fontSize: 14 }}>Connect or sign in with Stripe so the money from your bookings and sales is sent to you.</p>
              </div>
            )}
            {!payoutsReady && <a className="po-btn po-btn-gold" href="/finish">Set up payouts</a>}
            <button type="button" className="po-btn po-btn-ghost" style={{ color: "#F5F0E6", borderColor: "#3A3A3A" }} onClick={() => { onPayoutsDeferred(); setMode("hidden"); }}>
              {payoutsReady ? "Done" : "Do this later"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
