"use client";

// Admin vendors page — the per-row "Free plan" panel.
//   · Give free plan / Extend (date = end of that day in New York, or Permanent)
//   · Revoke free plan (inline confirm, same pattern as admin/applications rejectingId)
// The Free plan link card was removed (2026-10-21, Legend): free plans are offered with "Offer plan" now,
// and no unused claim link is left. The backend claim routes and /subscribe/free stay for any old link.
// Styling comes from the inline <style> block in page.tsx (same class names).

import { useState } from "react";
import {
  errorHint,
  etEndOfDayIso,
  etToday,
  isAfterEtToday,
  planLabel,
  type AdminSubscriptionSummary,
} from "@/lib/free-plan";

export interface PanelBusiness {
  id: string;
  name: string;
  subscription?: AdminSubscriptionSummary | null;
  hasConnectAccount?: boolean;
  stripeOnboardingComplete?: boolean | null;
}

interface Props {
  biz: PanelBusiness;
  /** Patch the row in the parent list so its label updates without a reload. */
  onSubscriptionChange: (businessId: string, subscription: AdminSubscriptionSummary) => void;
}

interface ApiResult {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
}

async function api(method: string, path: string, body?: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(path, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      data = {};
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Network error. Try again." } };
  }
}

function messageOf(data: Record<string, unknown>, fallback: string): string {
  return typeof data.error === "string" && data.error ? data.error : fallback;
}

/** The backend message verbatim, plus the sync hint only for the "still live" 409. */
function ErrorText({ message }: { message: string }) {
  const hint = errorHint(message);
  return (
    <p className="grant-err" role="alert">
      {message}
      {hint && (
        <>
          <br />
          {hint}
        </>
      )}
    </p>
  );
}

interface SubscriptionRowResponse {
  status?: string | null;
  currentPeriodEnd?: string | null;
}

export default function FreePlanPanel({ biz, onSubscriptionChange }: Props) {
  const label = planLabel(biz);
  const isActiveFree = label.kind === "free" && label.activeFree;

  // ── Give / Extend ────────────────────────────────────────────────────────
  const [giveDate, setGiveDate] = useState("");
  const [givePermanent, setGivePermanent] = useState(false);
  const [giveBusy, setGiveBusy] = useState(false);
  const [giveError, setGiveError] = useState("");
  const [giveNotice, setGiveNotice] = useState("");

  // ── Revoke plan ──────────────────────────────────────────────────────────
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeError, setRevokeError] = useState("");

  const giveOk = givePermanent || isAfterEtToday(giveDate);

  function expiryBody(permanent: boolean, date: string) {
    return permanent ? { permanent: true } : { expiresAt: etEndOfDayIso(date) };
  }

  function patchSubscription(row: SubscriptionRowResponse) {
    const prev = biz.subscription;
    onSubscriptionChange(biz.id, {
      tierName: prev?.isComplimentary ? prev.tierName : "waived",
      tierDisplayName: prev?.isComplimentary ? prev.tierDisplayName : "Waived",
      isComplimentary: true,
      status: row.status ?? "active",
      currentPeriodEnd: row.currentPeriodEnd ?? null,
      hasStripeSubscription: false,
    });
  }

  async function handleGive() {
    if (!giveOk || giveBusy) return;
    setGiveBusy(true);
    setGiveError("");
    setGiveNotice("");
    const r = await api("POST", `/api/admin/businesses/${encodeURIComponent(biz.id)}/complimentary-subscription`, expiryBody(givePermanent, giveDate));
    setGiveBusy(false);
    if (!r.ok) {
      setGiveError(messageOf(r.data, "Could not save the free plan."));
      return;
    }
    patchSubscription((r.data.subscription ?? {}) as SubscriptionRowResponse);
    setGiveNotice(r.data.connectReady === false ? "Needs Stripe Connect before they can get paid." : "Free plan saved.");
    setGiveDate("");
    setGivePermanent(false);
  }

  async function handleRevokePlan() {
    setRevokeBusy(true);
    setRevokeError("");
    const r = await api("DELETE", `/api/admin/businesses/${encodeURIComponent(biz.id)}/complimentary-subscription`);
    setRevokeBusy(false);
    if (!r.ok) {
      setRevokeError(messageOf(r.data, "Could not revoke the free plan."));
      return;
    }
    patchSubscription((r.data.subscription ?? {}) as SubscriptionRowResponse);
    setConfirmingRevoke(false);
    setGiveNotice("");
  }

  const minDate = (() => {
    // Day after today in New York: the first date that may be picked.
    const t = etToday();
    const d = new Date(`${t}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div className="fp">
      {/* ── Give / Extend + Revoke ─────────────────────────────────────── */}
      <div className="fp-card">
        <div className="fp-title">{isActiveFree ? "Extend free plan" : "Give free plan"}</div>
        <div className="fp-row">
          <input
            className="fp-date"
            type="date"
            min={minDate}
            value={giveDate}
            onChange={(e) => setGiveDate(e.target.value)}
            disabled={givePermanent || giveBusy}
            aria-label="Free plan end date (New York time)"
          />
          <label className="fp-check">
            <input type="checkbox" checked={givePermanent} onChange={(e) => setGivePermanent(e.target.checked)} disabled={giveBusy} />
            Permanent
          </label>
          <button className="btn btn-gold" onClick={handleGive} disabled={!giveOk || giveBusy}>
            {giveBusy ? "Saving…" : isActiveFree ? "Extend" : "Give free plan"}
          </button>
        </div>
        <span className="vp-td-sub">Ends at the end of that day, New York time.</span>
        {giveError && <ErrorText message={giveError} />}
        {giveNotice && <p className={giveNotice.startsWith("Needs") ? "grant-err" : "grant-ok"}>{giveNotice}</p>}

        {isActiveFree && (
          <div className="fp-revoke">
            {!confirmingRevoke ? (
              <button className="btn btn-ghost" onClick={() => { setConfirmingRevoke(true); setRevokeError(""); }}>
                Revoke free plan
              </button>
            ) : (
              <div className="fp-confirm">
                <span>Revoke the free plan now? Their storefront will go offline.</span>
                <span className="fp-confirm-actions">
                  <button className="btn btn-ghost" onClick={() => setConfirmingRevoke(false)} disabled={revokeBusy}>Cancel</button>
                  <button className="btn btn-gold" onClick={handleRevokePlan} disabled={revokeBusy}>
                    {revokeBusy ? "Revoking…" : "Confirm"}
                  </button>
                </span>
              </div>
            )}
            {revokeError && <ErrorText message={revokeError} />}
          </div>
        )}
      </div>

    </div>
  );
}
