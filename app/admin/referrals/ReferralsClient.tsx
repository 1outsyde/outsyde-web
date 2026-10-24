"use client";
/**
 * Admin referrals (referral Step 5b): tiles, Needs attention with its actions, Businesses and Friends tabs with
 * search. Data from GET /api/admin/referrals (BFF); labels, filters and which buttons show come from _lib/referrals.ts.
 * Every action has a two step confirm. Friend referrals are view only.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { shortDate } from "../events/_lib/money";
import { AuthScreen, NoticeBanner, Shell, StateScreen, errorText, type Notice } from "../events/_ui/shared";
import {
  ACTION_COPY, BIZ_FILTERS, actionsFor, at, attentionCopy, filterBusiness, filterFriends, friendPill, payoutPill, referralPill, usd,
  type AdminAction, type AdminReferralsData, type ActionButton, type Pill,
} from "./_lib/referrals";

type Auth = "loading" | "ok" | "unauthorized" | "forbidden" | "error";
type Tab = "business" | "friends";

function PillTag({ pill }: { pill: Pill }) {
  return <span className={`aem-pill aem-pill-${pill.tone}`}>{pill.text}</span>;
}

export default function ReferralsClient() {
  const [auth, setAuth] = useState<Auth>("loading");
  const [data, setData] = useState<AdminReferralsData | null>(null);
  const [tab, setTab] = useState<Tab>("business");
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/referrals", { cache: "no-store" });
      if (res.status === 401) return setAuth("unauthorized");
      if (res.status === 403) return setAuth("forbidden");
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        setNotice({ kind: "error", text: errorText(body, res.status) });
        return setAuth((a) => (a === "ok" ? "ok" : "error"));
      }
      setData(body as AdminReferralsData);
      setAuth("ok");
    } catch {
      setNotice({ kind: "error", text: "Couldn't reach the server. Refresh to try again." });
      setAuth((a) => (a === "ok" ? "ok" : "error"));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await load(); })();
    return () => { cancelled = true; };
  }, [load]);

  const run = async (kind: AdminAction, payoutId: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/referrals/payouts/${encodeURIComponent(payoutId)}/${kind}`, { method: "POST", cache: "no-store" });
      if (res.status === 401) return setAuth("unauthorized");
      if (res.status === 403) return setAuth("forbidden");
      const body = await res.json().catch(() => null);
      setNotice(res.ok ? { kind: "ok", text: ACTION_COPY[kind].done } : { kind: "error", text: errorText(body, res.status) });
      await load();
    } catch {
      setNotice({ kind: "error", text: "Couldn't reach the server. Refresh to see where this stands before trying again." });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const business = useMemo(() => (data ? filterBusiness(data.business, filter, search) : []), [data, filter, search]);
  const friends = useMemo(() => (data ? filterFriends(data.friends, search) : []), [data, search]);
  const byPayout = useMemo(() => new Map((data?.business ?? []).filter((b) => b.payout).map((b) => [b.payout!.id, b])), [data]);

  if (auth === "unauthorized" || auth === "forbidden") return <AuthScreen state={auth} returnTo="/admin/referrals" />;
  if (auth === "loading") return <StateScreen title="Loading referrals…" />;
  if (auth === "error" || !data) {
    return (
      <StateScreen title="Couldn't load referrals">
        <button type="button" className="aem-btn aem-btn-gold" onClick={() => { setAuth("loading"); load(); }}>Try again</button>
      </StateScreen>
    );
  }

  const Buttons = ({ payoutId, buttons }: { payoutId: string; buttons: ActionButton[] }) => {
    if (!buttons.length) return null;
    const pending = buttons.find((b) => confirm === `${b.kind}:${payoutId}`);
    if (pending) {
      return (
        <div className="arf-confirm">
          <span className="arf-confirm-text">{ACTION_COPY[pending.kind].confirm}</span>
          <div className="aem-actions">
            <button type="button" className={`aem-btn ${pending.tone === "danger" ? "arf-btn-danger" : "aem-btn-gold"}`} disabled={busy} onClick={() => run(pending.kind, payoutId)}>
              {busy ? "Working…" : `Yes, ${ACTION_COPY[pending.kind].label.toLowerCase()}`}
            </button>
            <button type="button" className="aem-btn aem-btn-ghost" disabled={busy} onClick={() => setConfirm(null)}>Keep it</button>
          </div>
        </div>
      );
    }
    return (
      <div className="aem-actions">
        {buttons.map((b) => (
          <button key={b.kind} type="button" disabled={busy}
            className={`aem-btn ${b.tone === "gold" ? "aem-btn-gold" : b.tone === "danger" ? "arf-btn-danger-ghost" : "aem-btn-ghost"}`}
            onClick={() => setConfirm(`${b.kind}:${payoutId}`)}>
            {ACTION_COPY[b.kind].label}
          </button>
        ))}
      </div>
    );
  };

  const t = data.totals;
  return (
    <Shell>
      <style dangerouslySetInnerHTML={{ __html: ARF_CSS }} />
      <div className="aem-head">
        <div>
          <h1 className="aem-h1">Referrals</h1>
          <div className="aem-sub">Business referrals pay $25 cash 7 days after they qualify. Friend referrals pay 2,500 points each.</div>
        </div>
        <button type="button" className="aem-btn aem-btn-ghost" onClick={() => load()} disabled={busy}>Refresh</button>
      </div>

      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />

      <div className="aem-tiles aem-tiles-5">
        <div className="aem-tile"><span className="aem-tile-label">Businesses referred</span><span className="aem-tile-value">{t.business.invited}</span><span className="aem-tile-hint">{t.business.pending} not live yet</span></div>
        <div className="aem-tile"><span className="aem-tile-label">Qualified</span><span className="aem-tile-value">{t.business.qualified}</span><span className="aem-tile-hint">{t.business.blocked} blocked, {t.business.expired} expired</span></div>
        <div className="aem-tile"><span className="aem-tile-label">Paid out</span><span className="aem-tile-value">{usd(t.payouts.paidCents)}</span><span className="aem-tile-hint">{t.payouts.cancelled} cancelled</span></div>
        <div className="aem-tile"><span className="aem-tile-label">Coming up</span><span className="aem-tile-value">{usd(t.payouts.upcomingCents)}</span><span className="aem-tile-hint">{usd(t.payouts.pausedCents)} paused, {usd(t.payouts.reviewCents)} need a look</span></div>
        <div className="aem-tile"><span className="aem-tile-label">Friend points given</span><span className="aem-tile-value">{t.friends.pointsAwarded.toLocaleString("en-US")}</span><span className="aem-tile-hint">{t.friends.completed} of {t.friends.total} friends</span></div>
      </div>

      <section aria-labelledby="arf-attn" className="arf-section">
        <div className="arf-row"><h2 id="arf-attn" className="aem-h2">Needs attention</h2>{data.attention.length > 0 && <span className="aem-count">{data.attention.length}</span>}</div>
        {data.attention.length === 0 ? (
          <div className="aem-none">Nothing needs you right now.</div>
        ) : (
          <div className="aem-attn">
            {data.attention.map((a) => {
              const c = attentionCopy(a.kind);
              const b = byPayout.get(a.payoutId);
              return (
                <div key={`${a.kind}-${a.payoutId}`} className="aem-attn-card">
                  <div className="aem-attn-top"><span className="aem-attn-kind">{c.title}</span><span className="aem-attn-amt">$25</span></div>
                  <div className="aem-attn-what">{a.businessName}, referred by {at(a.referrer)}</div>
                  <div className="aem-attn-why">{c.why}{a.since ? ` Due since ${shortDate(a.since)}.` : ""}</div>
                  {a.kind === "review" && a.detail ? <div className="aem-err">{a.detail}</div> : null}
                  {b ? <Buttons payoutId={a.payoutId} buttons={actionsFor(b)} /> : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="aem-toolbar">
        <div className="aem-switch" role="group" aria-label="Referral type">
          <button type="button" aria-pressed={tab === "business"} onClick={() => setTab("business")}>Businesses ({data.business.length})</button>
          <button type="button" aria-pressed={tab === "friends"} onClick={() => setTab("friends")}>Friends ({data.friends.length})</button>
        </div>
        <label className="aem-search">
          <span aria-hidden="true">⌕</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === "business" ? "Search business or @username" : "Search @username"} aria-label="Search referrals" />
        </label>
      </div>

      {tab === "business" ? (
        <>
          <div className="aem-chips" role="group" aria-label="Filter business referrals">
            {BIZ_FILTERS.map((f) => (
              <button key={f.key} type="button" className="aem-chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
            ))}
          </div>
          {business.length === 0 ? (
            <div className="aem-empty">{data.business.length === 0 ? "No business referrals yet." : "No referrals match."}</div>
          ) : (
            <ul className="arf-list">
              {business.map((b) => (
                <li key={b.id} className="arf-item">
                  <div className="arf-main">
                    <div className="aem-row-title">{b.businessName}</div>
                    <div className="aem-row-sub">Referred by {at(b.referrer.username)}, owner {at(b.owner.username)}{b.createdAt ? `, signed up ${shortDate(b.createdAt)}` : ""}</div>
                  </div>
                  <div className="aem-pills">
                    <PillTag pill={referralPill(b)} />
                    {b.payout ? <PillTag pill={payoutPill(b.payout)} /> : null}
                    {b.status === "pending" && b.expiresAt ? <span className="aem-row-sub">by {shortDate(b.expiresAt)}</span> : null}
                  </div>
                  {b.payout && (b.payout.attempts > 0 || b.payout.account || b.payout.transfer) ? (
                    <div className="aem-row-sub arf-meta">
                      {b.payout.attempts > 0 ? `${b.payout.attempts} tries. ` : ""}
                      {b.payout.account ? `Account ${b.payout.account}. ` : ""}
                      {b.payout.transfer ? `Transfer ${b.payout.transfer}.` : ""}
                    </div>
                  ) : null}
                  {b.payout ? <Buttons payoutId={b.payout.id} buttons={actionsFor(b)} /> : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : friends.length === 0 ? (
        <div className="aem-empty">{data.friends.length === 0 ? "No friend referrals yet." : "No referrals match."}</div>
      ) : (
        <ul className="arf-list">
          {friends.map((f) => (
            <li key={f.id} className="arf-item">
              <div className="arf-main">
                <div className="aem-row-title">{at(f.referrer.username)} invited {at(f.friend.username)}</div>
                <div className="aem-row-sub">{f.referrerPoints.toLocaleString("en-US")} points each{f.createdAt ? `, joined ${shortDate(f.createdAt)}` : ""}{f.paidAt ? `, points given ${shortDate(f.paidAt)}` : ""}</div>
              </div>
              <div className="aem-pills"><PillTag pill={friendPill(f)} /></div>
            </li>
          ))}
        </ul>
      )}

      <p className="aem-foot">Pause stops a payout until you release it. Cancel means no money goes out and can&apos;t be undone. While a payout may be sending, its buttons are hidden for a few minutes. Every action is recorded in the audit log.</p>
    </Shell>
  );
}

const ARF_CSS = `
.arf-section { display: flex; flex-direction: column; gap: 12px; }
.arf-row { display: flex; align-items: center; gap: 10px; }
.arf-list { list-style: none; margin: 0; padding: 0; border: 1px solid rgba(245,240,230,0.08); border-radius: 10px; }
.arf-item { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1.4fr) auto; gap: 8px 16px; align-items: center; padding: 14px 18px; border-bottom: 1px solid rgba(245,240,230,0.06); }
.arf-item:last-child { border-bottom: 0; }
.arf-main { min-width: 0; }
.arf-meta { grid-column: 1 / -1; margin-top: 0; }
.arf-confirm { display: flex; flex-direction: column; gap: 8px; max-width: 360px; }
.arf-confirm-text { font-size: 13px; color: #F5F0E6; line-height: 1.45; }
.arf-btn-danger { background: #ff6b6b; color: #000; }
.arf-btn-danger:hover:not(:disabled) { background: #ff8585; }
.arf-btn-danger-ghost { background: transparent; border-color: rgba(255,107,107,0.45); color: #ff6b6b; font-weight: 600; }
.arf-btn-danger-ghost:hover:not(:disabled) { border-color: #ff6b6b; }
@media (max-width: 767px) {
  .arf-item { grid-template-columns: minmax(0, 1fr); }
  .arf-item .aem-btn { height: 44px; }
}
`;
