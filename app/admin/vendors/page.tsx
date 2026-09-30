"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import FreePlanPanel from "./FreePlanPanel";
import { planLabel, type AdminSubscriptionSummary } from "@/lib/free-plan";

interface AdminBusiness {
  id: string;
  name: string;
  ownerEmail?: string | null;
  ownerName?: string | null;
  category?: string | null;
  approvalStatus?: string | null;
  createdAt?: string;
  // Additive fields from GET /api/admin/businesses (free-plan controls).
  subscription?: AdminSubscriptionSummary | null;
  hasConnectAccount?: boolean;
  stripeOnboardingComplete?: boolean | null;
}

interface Tier {
  id: string;
  name: string;
  displayName: string;
}

type AuthState = "loading" | "ok" | "unauthorized" | "forbidden";

const DEBOUNCE_MS = 300;

function formatDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

export default function AdminVendorsPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [total, setTotal] = useState(0);
  const [grandfatheredTierId, setGrandfatheredTierId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Per-row grant link state: businessId → { loading, url, error }
  const [grantState, setGrantState] = useState<
    Record<string, { loading?: boolean; url?: string; error?: string; copied?: boolean }>
  >({});

  // Per-row free-plan panel state: businessId → { open }. Separate from grantState.
  const [freeState, setFreeState] = useState<Record<string, { open?: boolean }>>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    setLoadError(null);
    const params = new URLSearchParams({ limit: "100", offset: "0" });
    if (q) params.set("search", q);

    const [bizRes, tiersRes] = await Promise.all([
      fetch(`/api/admin/businesses?${params.toString()}`),
      fetch("/api/subscription/tiers"),
    ]);

    if (bizRes.status === 401 || bizRes.status === 403) {
      setAuthState(bizRes.status === 401 ? "unauthorized" : "forbidden");
      return;
    }

    if (!bizRes.ok) {
      setLoadError("Failed to load vendors.");
      setAuthState("ok");
      return;
    }

    const bizData = await bizRes.json() as { businesses?: AdminBusiness[]; total?: number };
    setBusinesses(bizData.businesses ?? []);
    setTotal(bizData.total ?? bizData.businesses?.length ?? 0);
    setAuthState("ok");

    if (tiersRes.ok) {
      const tiersData = await tiersRes.json() as { tiers?: Tier[] };
      const gf = tiersData.tiers?.find((t) => t.name === "grandfathered");
      if (gf) setGrandfatheredTierId(gf.id);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      load(value);
    }, DEBOUNCE_MS);
  }

  async function handleGenerateLink(businessId: string) {
    if (!grandfatheredTierId) return;
    setGrantState((prev) => ({ ...prev, [businessId]: { loading: true } }));
    try {
      const res = await fetch("/api/admin/subscription/grant-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, tierId: grandfatheredTierId }),
      });
      const data = await res.json() as { grantUrl?: string; error?: string };
      if (!res.ok || !data.grantUrl) {
        setGrantState((prev) => ({
          ...prev,
          [businessId]: { error: data.error ?? "Failed to generate link." },
        }));
        return;
      }
      setGrantState((prev) => ({ ...prev, [businessId]: { url: data.grantUrl } }));
    } catch {
      setGrantState((prev) => ({
        ...prev,
        [businessId]: { error: "Network error. Try again." },
      }));
    }
  }

  async function handleCopy(businessId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setGrantState((prev) => ({ ...prev, [businessId]: { url, copied: true } }));
      setTimeout(() => {
        setGrantState((prev) => ({ ...prev, [businessId]: { url } }));
      }, 2000);
    } catch {
      // fallback: select the input
    }
  }

  function toggleFreePanel(businessId: string) {
    setFreeState((prev) => ({ ...prev, [businessId]: { open: !prev[businessId]?.open } }));
  }

  function updateSubscription(businessId: string, subscription: AdminSubscriptionSummary) {
    setBusinesses((prev) => prev.map((b) => (b.id === businessId ? { ...b, subscription } : b)));
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; }
    .vp { font-family: 'Hanken Grotesk', 'Inter', sans-serif; }
    .vp-h1 {
      font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 0.04em;
      color: #F5F0E6; margin-bottom: 6px;
    }
    .vp-sub { color: rgba(245,240,230,0.5); font-size: 14px; margin-bottom: 24px; }

    .vp-search-row {
      display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
    }
    .vp-search {
      flex: 1; background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.1);
      border-radius: 8px; color: #F5F0E6; font-family: inherit; font-size: 14px;
      padding: 10px 14px; outline: none;
    }
    .vp-search::placeholder { color: rgba(245,240,230,0.3); }
    .vp-search:focus { border-color: rgba(232,185,48,0.4); }
    .vp-count { font-size: 13px; color: rgba(245,240,230,0.35); white-space: nowrap; }

    .vp-table { width: 100%; border-collapse: collapse; }
    .vp-th {
      font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase;
      color: rgba(245,240,230,0.35); padding: 0 12px 10px; text-align: left;
      font-weight: 600; border-bottom: 1px solid rgba(245,240,230,0.06);
    }
    .vp-tr:hover .vp-td { background: rgba(245,240,230,0.02); }
    .vp-td {
      padding: 13px 12px; border-bottom: 1px solid rgba(245,240,230,0.04);
      font-size: 14px; color: #F5F0E6; vertical-align: top;
      transition: background .1s;
    }
    .vp-td-sub { display: block; font-size: 12px; color: rgba(245,240,230,0.4); margin-top: 2px; }
    .vp-status {
      display: inline-block; font-size: 10px; letter-spacing: 0.07em;
      text-transform: uppercase; padding: 3px 8px; border-radius: 999px; font-weight: 600;
    }
    .vp-status-approved { background: rgba(16,185,129,0.12); color: #34d399; }
    .vp-status-pending  { background: rgba(232,185,48,0.12);  color: #E8B930; }
    .vp-status-rejected { background: rgba(255,107,107,0.12); color: #ff6b6b; }
    .vp-status-default  { background: rgba(245,240,230,0.07); color: rgba(245,240,230,0.5); }

    .btn {
      font-family: inherit; font-size: 12.5px; font-weight: 600; padding: 7px 14px;
      border-radius: 6px; cursor: pointer; border: 1px solid transparent;
      letter-spacing: 0.03em; transition: all .15s; white-space: nowrap;
    }
    .btn-gold { background: #E8B930; color: #000; }
    .btn-gold:hover:not(:disabled) { background: #F5CC50; }
    .btn-gold:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-ghost { background: transparent; border-color: rgba(245,240,230,0.15); color: #F5F0E6; }
    .btn-ghost:hover:not(:disabled) { border-color: rgba(245,240,230,0.3); }
    .btn-copy { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #34d399; }
    .btn-copy:hover { background: rgba(16,185,129,0.25); }

    .grant-url {
      display: flex; align-items: center; gap: 8px; margin-top: 8px;
      background: rgba(245,240,230,0.04); border: 1px solid rgba(245,240,230,0.08);
      border-radius: 6px; padding: 8px 10px;
    }
    .grant-url-text {
      flex: 1; font-size: 11px; color: rgba(245,240,230,0.6);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-family: 'Courier New', monospace;
    }
    .grant-err { font-size: 12px; color: #ff6b6b; margin-top: 6px; }
    .grant-ok  { font-size: 12px; color: #34d399; margin-top: 4px; }

    .empty-state {
      text-align: center; padding: 48px 20px;
      color: rgba(245,240,230,0.3); font-size: 14px;
    }
    .state-msg {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 40vh; text-align: center; gap: 8px;
    }
    .state-msg-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #F5F0E6; }
    .state-msg-sub { color: rgba(245,240,230,0.5); font-size: 14px; max-width: 400px; }

    /* ── Free plan (complimentary) controls ───────────────────────────────── */
    .vp-plan { display: block; font-size: 12px; margin-top: 4px; color: #34d399; font-weight: 600; }
    .vp-plan-paid { color: rgba(245,240,230,0.6); font-weight: 500; }
    .vp-plan-ended { color: rgba(245,240,230,0.45); }
    .vp-chip-warn {
      display: inline-block; margin-top: 4px; font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase;
      padding: 3px 8px; border-radius: 999px; font-weight: 600;
      background: rgba(232,185,48,0.12); color: #E8B930;
    }
    .vp-free-btn { display: block; margin-top: 8px; font-size: 11.5px; padding: 5px 10px; }
    .vp-panel-td { padding: 0 12px 16px; border-bottom: 1px solid rgba(245,240,230,0.04); }
    .fp { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .fp-card {
      background: rgba(245,240,230,0.03); border: 1px solid rgba(245,240,230,0.08);
      border-radius: 10px; padding: 16px; min-width: 0;
    }
    .fp-title { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(245,240,230,0.4); margin-bottom: 10px; font-weight: 600; }
    .fp-subtitle { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(245,240,230,0.4); margin: 16px 0 8px; font-weight: 600; }
    .fp-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 6px; }
    .fp-date {
      background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.1); border-radius: 6px;
      color: #F5F0E6; font-family: inherit; font-size: 14px; padding: 7px 10px; outline: none; color-scheme: dark;
    }
    .fp-date:focus { border-color: rgba(232,185,48,0.4); }
    .fp-date:disabled { opacity: 0.4; }
    .fp-check { display: flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(245,240,230,0.75); cursor: pointer; }
    .fp-revoke { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(245,240,230,0.06); }
    .fp-confirm {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
      background: rgba(232,185,48,0.1); border: 1px solid rgba(232,185,48,0.3); border-radius: 6px;
      padding: 10px 12px; font-size: 12.5px; color: #E8B930; line-height: 1.45;
    }
    .fp-confirm-actions { display: flex; gap: 8px; }
    .fp-links { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .fp-link { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
    .fp-link-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .fp-pill {
      display: inline-block; align-self: flex-start; font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase;
      padding: 3px 8px; border-radius: 999px; font-weight: 600;
    }
    .fp-pill-pending { background: rgba(232,185,48,0.12); color: #E8B930; }
    .fp-pill-claimed { background: rgba(16,185,129,0.12); color: #34d399; }
    .fp-pill-revoked, .fp-pill-expired { background: rgba(245,240,230,0.07); color: rgba(245,240,230,0.5); }

    @media (max-width: 700px) {
      .vp-th-hide, .vp-td-hide { display: none; }
      .fp { grid-template-columns: 1fr; }
    }
  `;

  if (authState === "loading") {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="vp state-msg"><div className="state-msg-title">Loading…</div></div>
      </>
    );
  }

  if (authState === "unauthorized") {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="vp state-msg">
          <div className="state-msg-title">Not signed in</div>
          <div className="state-msg-sub">
            <a href="/login" style={{ color: "#E8B930" }}>Log in</a> to access admin.
          </div>
        </div>
      </>
    );
  }

  if (authState === "forbidden") {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="vp state-msg">
          <div className="state-msg-title">Not authorized</div>
          <div className="state-msg-sub">Admin access required.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <div className="vp">
        <div className="vp-h1">Vendors</div>
        <div className="vp-sub">
          Generate grandfathered plan links for existing vendors, or give a free plan / free-plan link from each row.
          {!grandfatheredTierId && (
            <span style={{ color: "#ff6b6b", marginLeft: 8 }}>
              ⚠ Grandfathered tier not found — grant links unavailable.
            </span>
          )}
        </div>

        <div className="vp-search-row">
          <input
            className="vp-search"
            type="search"
            placeholder="Search by business name…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <span className="vp-count">{total} vendor{total !== 1 ? "s" : ""}</span>
        </div>

        {loadError && (
          <p style={{ color: "#ff6b6b", fontSize: 14, marginBottom: 16 }}>{loadError}</p>
        )}

        {businesses.length === 0 ? (
          <div className="empty-state">No vendors found.</div>
        ) : (
          <table className="vp-table">
            <thead>
              <tr>
                <th className="vp-th">Business</th>
                <th className="vp-th vp-th-hide">Owner</th>
                <th className="vp-th vp-th-hide">Status</th>
                <th className="vp-th">Grant Link</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((biz) => {
                const gs = grantState[biz.id] ?? {};
                const statusKey = (biz.approvalStatus ?? "").toLowerCase();
                const statusClass =
                  statusKey === "approved" ? "vp-status-approved"
                  : statusKey === "pending" ? "vp-status-pending"
                  : statusKey === "rejected" ? "vp-status-rejected"
                  : "vp-status-default";

                const pl = planLabel(biz);
                const freeOpen = !!freeState[biz.id]?.open;

                return (
                  <Fragment key={biz.id}>
                  <tr className="vp-tr">
                    <td className="vp-td">
                      <span style={{ fontWeight: 500 }}>{biz.name}</span>
                      <span className="vp-td-sub">{biz.id}</span>
                      {pl.text && (
                        <span className={`vp-plan${pl.kind === "paid" ? " vp-plan-paid" : ""}${pl.end === "ended" ? " vp-plan-ended" : ""}`}>
                          {pl.text}
                        </span>
                      )}
                      {pl.needsStripeConnect && <span className="vp-chip-warn">Needs Stripe Connect</span>}
                      <button
                        className="btn btn-ghost vp-free-btn"
                        aria-expanded={freeOpen}
                        onClick={() => toggleFreePanel(biz.id)}
                      >
                        {freeOpen ? "Hide free plan" : "Free plan"}
                      </button>
                    </td>
                    <td className="vp-td vp-td-hide">
                      {biz.ownerName && <span>{biz.ownerName}</span>}
                      {biz.ownerEmail && (
                        <span className="vp-td-sub">{biz.ownerEmail}</span>
                      )}
                    </td>
                    <td className="vp-td vp-td-hide">
                      <span className={`vp-status ${statusClass}`}>
                        {biz.approvalStatus ?? "—"}
                      </span>
                      {biz.createdAt && (
                        <span className="vp-td-sub">{formatDate(biz.createdAt)}</span>
                      )}
                    </td>
                    <td className="vp-td">
                      {!gs.url ? (
                        <button
                          className="btn btn-gold"
                          disabled={!grandfatheredTierId || !!gs.loading}
                          onClick={() => handleGenerateLink(biz.id)}
                        >
                          {gs.loading ? "Generating…" : "Generate Grant Link"}
                        </button>
                      ) : (
                        <div>
                          <div className="grant-url">
                            <span className="grant-url-text">{gs.url}</span>
                            <button
                              className="btn btn-copy"
                              onClick={() => handleCopy(biz.id, gs.url!)}
                            >
                              {gs.copied ? "Copied!" : "Copy"}
                            </button>
                          </div>
                          <span className="grant-ok">Valid for 48 hours.</span>
                          <div style={{ marginTop: 6 }}>
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: 11, padding: "4px 10px" }}
                              onClick={() =>
                                setGrantState((prev) => {
                                  const next = { ...prev };
                                  delete next[biz.id];
                                  return next;
                                })
                              }
                            >
                              Regenerate
                            </button>
                          </div>
                        </div>
                      )}
                      {gs.error && <p className="grant-err">{gs.error}</p>}
                    </td>
                  </tr>
                  {freeOpen && (
                    <tr className="vp-tr">
                      <td className="vp-panel-td" colSpan={4}>
                        <FreePlanPanel biz={biz} onSubscriptionChange={updateSubscription} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
