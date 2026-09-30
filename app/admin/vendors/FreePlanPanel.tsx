"use client";

// Admin vendors page — the per-row "Free plan" panel.
//   · Give free plan / Extend (date = end of that day in New York, or Permanent)
//   · Revoke free plan (inline confirm, same pattern as admin/applications rejectingId)
//   · Generate Free Plan Link (single use, 7 days) + the pending-links list
// Styling comes from the inline <style> block in page.tsx (same class names).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  claimLinkStatus,
  errorHint,
  etEndOfDayIso,
  etToday,
  formatEtDate,
  isAfterEtToday,
  planLabel,
  type AdminSubscriptionSummary,
  type ClaimLinkRow,
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

  // ── Claim link ───────────────────────────────────────────────────────────
  const [linkDate, setLinkDate] = useState("");
  const [linkPermanent, setLinkPermanent] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const urlRef = useRef<HTMLSpanElement | null>(null);

  // ── Pending links (loaded when the panel opens) ──────────────────────────
  const [links, setLinks] = useState<ClaimLinkRow[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [linksError, setLinksError] = useState("");
  const [confirmingLinkId, setConfirmingLinkId] = useState<string | null>(null);
  const [linkRevokeBusy, setLinkRevokeBusy] = useState(false);
  const [linkRevokeError, setLinkRevokeError] = useState("");

  const applyLinks = useCallback((r: ApiResult) => {
    if (!r.ok) {
      setLinksError(messageOf(r.data, "Could not load links."));
    } else {
      setLinksError("");
      setLinks(Array.isArray(r.data.links) ? (r.data.links as ClaimLinkRow[]) : []);
    }
    setLinksLoading(false);
  }, []);

  const linksPath = `/api/admin/subscription/complimentary-link?businessId=${encodeURIComponent(biz.id)}`;

  // Re-read the list after a link is created or revoked (called from event handlers).
  const loadLinks = useCallback(async () => {
    applyLinks(await api("GET", linksPath));
  }, [applyLinks, linksPath]);

  // Load once when the panel opens (the panel only exists while it is open).
  useEffect(() => {
    let active = true;
    api("GET", linksPath).then((r) => {
      if (active) applyLinks(r);
    });
    return () => {
      active = false;
    };
  }, [linksPath, applyLinks]);

  const giveOk = givePermanent || isAfterEtToday(giveDate);
  const linkOk = linkPermanent || isAfterEtToday(linkDate);

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

  async function handleGenerateLink() {
    if (!linkOk || linkBusy) return;
    setLinkBusy(true);
    setLinkError("");
    setCopied(false);
    const r = await api("POST", "/api/admin/subscription/complimentary-link", { businessId: biz.id, ...expiryBody(linkPermanent, linkDate) });
    setLinkBusy(false);
    if (!r.ok || typeof r.data.url !== "string") {
      setLinkUrl("");
      setLinkError(messageOf(r.data, "Failed to generate link."));
      return;
    }
    setLinkUrl(r.data.url);
    loadLinks();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused: select the text so the admin can copy it by hand.
      const el = urlRef.current;
      if (el) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(el);
        selection?.addRange(range);
      }
    }
  }

  async function handleRevokeLink(id: string) {
    setLinkRevokeBusy(true);
    setLinkRevokeError("");
    const r = await api("DELETE", `/api/admin/subscription/complimentary-link/${encodeURIComponent(id)}`);
    setLinkRevokeBusy(false);
    if (!r.ok) {
      setLinkRevokeError(messageOf(r.data, "Could not revoke the link."));
    } else {
      setConfirmingLinkId(null);
    }
    await loadLinks();
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

      {/* ── Claim link ─────────────────────────────────────────────────── */}
      <div className="fp-card">
        <div className="fp-title">Free plan link</div>
        <div className="fp-row">
          <input
            className="fp-date"
            type="date"
            min={minDate}
            value={linkDate}
            onChange={(e) => setLinkDate(e.target.value)}
            disabled={linkPermanent || linkBusy}
            aria-label="Plan end date for the link (New York time)"
          />
          <label className="fp-check">
            <input type="checkbox" checked={linkPermanent} onChange={(e) => setLinkPermanent(e.target.checked)} disabled={linkBusy} />
            Permanent
          </label>
          <button className="btn btn-gold" onClick={handleGenerateLink} disabled={!linkOk || linkBusy}>
            {linkBusy ? "Generating…" : "Generate Free Plan Link"}
          </button>
        </div>
        {linkError && <ErrorText message={linkError} />}
        {linkUrl && (
          <div>
            <div className="grant-url">
              <span className="grant-url-text" ref={urlRef}>{linkUrl}</span>
              <button className="btn btn-copy" onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</button>
            </div>
            <span className="grant-ok">Valid for 7 days, one use. Only the business owner can claim it.</span>
          </div>
        )}

        <div className="fp-subtitle">Links</div>
        {linksLoading ? (
          <span className="vp-td-sub">Loading…</span>
        ) : linksError ? (
          <ErrorText message={linksError} />
        ) : links.length === 0 ? (
          <span className="vp-td-sub">No links yet.</span>
        ) : (
          <ul className="fp-links">
            {links.map((l) => {
              const st = claimLinkStatus(l);
              return (
                <li key={l.id} className="fp-link">
                  <div className="fp-link-main">
                    <span className={`fp-pill fp-pill-${st.status}`}>{st.label}</span>
                    <span className="vp-td-sub">
                      {l.planExpiresAt ? `Plan until ${formatEtDate(l.planExpiresAt)}` : "Permanent plan"}
                      {l.createdAt ? ` · created ${formatEtDate(l.createdAt)}` : ""}
                    </span>
                  </div>
                  {st.status === "pending" && (
                    confirmingLinkId === l.id ? (
                      <div className="fp-confirm">
                        <span>Revoke this link?</span>
                        <span className="fp-confirm-actions">
                          <button className="btn btn-ghost" onClick={() => setConfirmingLinkId(null)} disabled={linkRevokeBusy}>Cancel</button>
                          <button className="btn btn-gold" onClick={() => handleRevokeLink(l.id)} disabled={linkRevokeBusy}>
                            {linkRevokeBusy ? "Revoking…" : "Confirm"}
                          </button>
                        </span>
                      </div>
                    ) : (
                      <button className="btn btn-ghost" onClick={() => { setConfirmingLinkId(l.id); setLinkRevokeError(""); }}>
                        Revoke
                      </button>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {linkRevokeError && <ErrorText message={linkRevokeError} />}
      </div>
    </div>
  );
}
