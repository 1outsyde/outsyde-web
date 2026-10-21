"use client";

// Admin vendors page: the "Plan offer" column (artboard "Admin: Offer plan replaces Generate Grant Link").
//   · No pending offer: "Offer plan" opens a small panel: Grandfathered, or Free plan with an end date or
//     permanent (end of that day in New York, same as the Free plan panel). "Send offer" saves it and the
//     backend emails, pushes and notifies the owner.
//   · Pending: "<plan> offer sent <date>. Waiting for them to accept." + "Withdraw offer".
//   · Accepted / withdrawn: shown as text; a new offer can be sent once nothing is pending.
// Styling comes from the inline <style> block in page.tsx.

import { useState } from "react";
import { adminOfferText, type AdminOfferSummary } from "@/lib/plan-offer";
import { etEndOfDayIso, etToday, isAfterEtToday } from "@/lib/free-plan";

interface Props {
  businessId: string;
  ownerLabel: string;
  offer: AdminOfferSummary | null | undefined;
  onOfferChange: (businessId: string, offer: AdminOfferSummary) => void;
  /** Reload the list when the row is out of date (accepted or withdrawn meanwhile). */
  onStale: () => void;
}

async function send(method: string, path: string, body?: unknown) {
  try {
    const res = await fetch(path, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Network error. Try again." } as Record<string, unknown> };
  }
}

function messageOf(data: Record<string, unknown>, fallback: string): string {
  const e = data.error;
  if (typeof e === "string" && e) return e;
  if (e && typeof e === "object" && typeof (e as { message?: unknown }).message === "string") return (e as { message: string }).message;
  return fallback;
}

export default function OfferCell({ businessId, ownerLabel, offer, onOfferChange, onStale }: Props) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<"grandfathered" | "free">("grandfathered");
  const [date, setDate] = useState("");
  const [permanent, setPermanent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

  const pending = offer?.status === "pending";
  const state = adminOfferText(offer);
  const freeOk = permanent || isAfterEtToday(date);
  const canSend = plan === "grandfathered" || freeOk;
  const path = `/api/admin/businesses/${encodeURIComponent(businessId)}/plan-offer`;

  const minDate = (() => {
    const d = new Date(`${etToday()}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  async function handleSend() {
    if (!canSend || busy) return;
    setBusy(true);
    setError("");
    const body = plan === "grandfathered" ? { plan } : permanent ? { plan, permanent: true } : { plan, expiresAt: etEndOfDayIso(date) };
    const r = await send("POST", path, body);
    setBusy(false);
    if (!r.ok || !r.data.offer) {
      setError(messageOf(r.data, "Could not send the offer."));
      if (r.status === 409) onStale();
      return;
    }
    onOfferChange(businessId, r.data.offer as AdminOfferSummary);
    setOpen(false);
    setDate("");
    setPermanent(false);
  }

  async function handleWithdraw() {
    setBusy(true);
    setError("");
    const r = await send("DELETE", path);
    setBusy(false);
    if (!r.ok || !r.data.offer) {
      setError(messageOf(r.data, "Could not withdraw the offer."));
      if (r.status === 404) { setConfirmingWithdraw(false); onStale(); }
      return;
    }
    onOfferChange(businessId, r.data.offer as AdminOfferSummary);
    setConfirmingWithdraw(false);
  }

  return (
    <div>
      {offer && <span className={`vp-offer vp-offer-${state.tone}`}>{state.text}</span>}

      {pending ? (
        confirmingWithdraw ? (
          <div className="fp-confirm" style={{ marginTop: 8 }}>
            <span>Withdraw this offer? An open checkout is closed too.</span>
            <span className="fp-confirm-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmingWithdraw(false)} disabled={busy}>Cancel</button>
              <button className="btn btn-gold" onClick={handleWithdraw} disabled={busy}>{busy ? "Withdrawing…" : "Confirm"}</button>
            </span>
          </div>
        ) : (
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => { setConfirmingWithdraw(true); setError(""); }}>
            Withdraw offer
          </button>
        )
      ) : (
        <button className="btn btn-gold" style={{ marginTop: offer ? 8 : 0 }} aria-expanded={open} onClick={() => { setOpen(!open); setError(""); }}>
          {open ? "Close" : "Offer plan"}
        </button>
      )}

      {open && !pending && (
        <div className="vp-offer-panel">
          <p className="vp-offer-q">WHICH PLAN?</p>
          <label className={`vp-offer-opt${plan === "grandfathered" ? " vp-offer-opt-on" : ""}`}>
            <input type="radio" name={`plan-${businessId}`} checked={plan === "grandfathered"} onChange={() => setPlan("grandfathered")} />
            <span>
              <span className="vp-offer-opt-title">Grandfathered</span>
              <span className="vp-offer-opt-sub">The founding price, monthly. They add a card if none is saved.</span>
            </span>
          </label>
          <label className={`vp-offer-opt${plan === "free" ? " vp-offer-opt-on" : ""}`}>
            <input type="radio" name={`plan-${businessId}`} checked={plan === "free"} onChange={() => setPlan("free")} />
            <span>
              <span className="vp-offer-opt-title">Free plan</span>
              <span className="vp-offer-opt-sub">No charge. Pick an end date or make it permanent.</span>
            </span>
          </label>
          {plan === "free" && (
            <div className="fp-row">
              <input
                className="vp-offer-date"
                type="date"
                min={minDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={permanent || busy}
                aria-label="Free plan end date (New York time)"
              />
              <label className="vp-offer-check">
                <input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)} disabled={busy} />
                Permanent
              </label>
            </div>
          )}
          <p className="vp-offer-note">
            {ownerLabel} sees a popup the next time they sign in to the app or goutsyde.com, and gets an email and a push notification now.
          </p>
          {error && <p className="grant-err" role="alert">{error}</p>}
          <button className="vp-offer-send" onClick={handleSend} disabled={!canSend || busy}>{busy ? "Sending…" : "Send offer"}</button>
        </div>
      )}
      {!open && error && <p className="grant-err" role="alert">{error}</p>}
    </div>
  );
}
