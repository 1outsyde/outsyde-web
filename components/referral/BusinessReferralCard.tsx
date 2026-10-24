"use client";

// Business referral card (2026-10-24): share your code with a business, see the businesses you
// referred and their $25 payouts. Shown on /account/points and /vendor-dashboard. Loads on its own
// (never blocks the page) and stays hidden when the person is signed out or the list can't load.

import { useEffect, useState } from "react";
import {
  BUSINESS_REFERRAL_COPY,
  businessReferralLine,
  businessSignupHrefForCode,
  needsPayoutSetup,
  type BusinessReferral,
} from "@/lib/referral";
import { stripeUrl } from "@/app/e/_shared/format";

type Totals = { invited: number; qualified: number; paidCents: number; waitingCents: number };
type Loaded = { referrals: BusinessReferral[]; totals: Totals };

const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString()}`;

export default function BusinessReferralCard({
  code: codeProp,
  onSetupPayouts,
}: {
  /** The person's referral code, when the page already has it. Fetched otherwise. */
  code?: string | null;
  /** Vendors are paid to their business Stripe account, so the dashboard passes its own setup. */
  onSetupPayouts?: () => void;
}) {
  const [data, setData] = useState<Loaded | null>(null);
  const [fetchedCode, setFetchedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [opening, setOpening] = useState(false);
  const [setupError, setSetupError] = useState("");
  const code = codeProp ?? fetchedCode;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/business-referrals", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled && Array.isArray(j?.referrals) && j?.totals) setData({ referrals: j.referrals, totals: j.totals });
      } catch { /* hidden */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (codeProp) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/referral", { cache: "no-store" });
        if (!res.ok) return;
        const j = await res.json();
        if (!cancelled && typeof j?.referralCode === "string") setFetchedCode(j.referralCode);
      } catch { /* hidden */ }
    })();
    return () => { cancelled = true; };
  }, [codeProp]);

  if (!data || !code) return null;
  const link = `${window.location.origin}${businessSignupHrefForCode(code)}`;
  const showSetup = needsPayoutSetup(data.referrals);

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }
  async function share() {
    const shareData = { title: "Join Outsyde as a business", text: BUSINESS_REFERRAL_COPY.cardBody, url: link };
    if (typeof navigator.share === "function") {
      try { await navigator.share(shareData); return; } catch { /* fall back to copy */ }
    }
    await copy();
  }
  async function setupPayouts() {
    if (onSetupPayouts) { onSetupPayouts(); return; }
    setOpening(true);
    setSetupError("");
    try {
      const res = await fetch("/api/events/payouts/setup-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await res.json().catch(() => ({}));
      const url = stripeUrl(j?.url);
      if (res.ok && url) { window.location.assign(url); return; }
      setSetupError("Couldn't open Stripe. Please try again.");
    } catch {
      setSetupError("Couldn't open Stripe. Please try again.");
    }
    setOpening(false);
  }

  return (
    <section className="brc" aria-labelledby="brc-title">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <h2 id="brc-title" className="brc-title">{BUSINESS_REFERRAL_COPY.cardTitle}</h2>
      <p className="brc-body">{BUSINESS_REFERRAL_COPY.cardBody}</p>
      <div className="brc-actions">
        <button type="button" className="brc-btn" onClick={share}>Share link</button>
        <button type="button" className="brc-ghost" onClick={copy}>{copied ? "Link copied" : "Copy link"}</button>
      </div>

      <div className="brc-stats">
        <span><b>{data.totals.invited}</b>invited</span>
        <span><b>{data.totals.qualified}</b>qualified</span>
        <span><b>{dollars(data.totals.paidCents)}</b>paid</span>
        {data.totals.waitingCents > 0 && <span><b>{dollars(data.totals.waitingCents)}</b>on the way</span>}
      </div>

      {showSetup && (
        <div className="brc-setup" role="status">
          <p>{BUSINESS_REFERRAL_COPY.setupPayoutsBody}</p>
          {setupError && <p className="brc-err" role="alert">{setupError}</p>}
          <button type="button" className="brc-btn" onClick={setupPayouts} disabled={opening}>
            {opening ? "Opening Stripe…" : BUSINESS_REFERRAL_COPY.setupPayouts}
          </button>
        </div>
      )}

      {data.referrals.length === 0 ? (
        <p className="brc-empty">{BUSINESS_REFERRAL_COPY.empty}</p>
      ) : (
        <ul className="brc-list">
          {data.referrals.map((r, i) => (
            <li key={`${r.businessName}-${i}`} className="brc-item">
              <span className="brc-name">{r.businessName}</span>
              <span className="brc-line">{businessReferralLine(r)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const css = `
.brc { background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 22px; margin: 20px 0; color: #F5F0E6; display: flex; flex-direction: column; gap: 14px; }
.brc-title { font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 28px; letter-spacing: 0.04em; margin: 0; color: #F5F0E6; }
.brc-body { font-size: 14px; line-height: 1.6; color: #B8B0A0; margin: 0; }
.brc-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.brc-btn { font-family: inherit; font-size: 14px; font-weight: 600; padding: 10px 18px; border-radius: 6px; border: none; background: #E8B930; color: #000; cursor: pointer; }
.brc-btn:hover { background: #f0c64a; }
.brc-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.brc-ghost { font-family: inherit; font-size: 14px; padding: 10px 18px; border-radius: 6px; border: 1px solid #3a3a3a; background: transparent; color: #F5F0E6; cursor: pointer; }
.brc-ghost:hover { border-color: #5a5a5a; }
.brc-btn:focus-visible, .brc-ghost:focus-visible { outline: 2px solid #F5F0E6; outline-offset: 2px; }
.brc-stats { display: flex; flex-wrap: wrap; gap: 18px; font-size: 12px; color: #8a8378; }
.brc-stats b { display: block; font-family: 'Bebas Neue', sans-serif; font-weight: 400; font-size: 24px; color: #E8B930; }
.brc-setup { border: 1px solid rgba(232,185,48,0.35); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.brc-setup p { margin: 0; font-size: 14px; color: #F5F0E6; }
.brc-err { color: #e57a6e !important; }
.brc-empty { font-size: 13px; color: #8a8378; margin: 0; }
.brc-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.brc-item { display: flex; flex-direction: column; gap: 2px; padding: 10px 0; border-top: 1px solid #222; }
.brc-name { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.brc-line { font-size: 13px; color: #B8B0A0; }
`;
