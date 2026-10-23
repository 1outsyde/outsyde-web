"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EDITOR_CSS } from "./editorStyles";
import { MANAGE_CSS } from "./manageStyles";
import { isHostEvent, isHostTicketType, shareUrl, type HostEvent, type HostTicketType } from "./editorLogic";
import {
  CANCEL_CONFIRM_COPY, backendMessage, canCancel, cancelNotice, checkedInCount, earningsHint, guestHandle, guestLine, guestName,
  isDoorGuest, isHostOrder, isSummary, orderLine, payoutCard, refundConfirmCopy, refundableOrders, refundedLine, statusLabel,
  takenLine, typeRowText, typeRows, whenWhere,
  type DoorGuest, type HostOrder, type Summary,
} from "./manageLogic";
import { errorCopy, money, GENERIC_ERROR } from "../../e/_shared/format";

type Screen = "loading" | "ready" | "notfound" | "error";
type ApiResult = { status: number; body: any } | null;

const GUEST_PREVIEW = 8;

export default function ManageClient({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [event, setEvent] = useState<HostEvent | null>(null);
  const [types, setTypes] = useState<HostTicketType[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [orders, setOrders] = useState<HostOrder[]>([]);
  const [guests, setGuests] = useState<DoorGuest[]>([]);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [showAllGuests, setShowAllGuests] = useState(false);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [refundId, setRefundId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const [copied, setCopied] = useState<"yes" | "no" | null>(null);

  const toLogin = useCallback(() => {
    router.replace(`/login?return=${encodeURIComponent(window.location.pathname)}`);
  }, [router]);

  /** Fetch a BFF. null when the person is signed out (already sent to login). Never throws. */
  const call = useCallback(async (method: string, path: string, body?: unknown): Promise<ApiResult> => {
    try {
      const res = await fetch(path, {
        method,
        cache: "no-store",
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401) { toLogin(); return null; }
      return { status: res.status, body: await res.json().catch(() => null) };
    } catch {
      return { status: 0, body: null };
    }
  }, [toLogin]);

  /** Sales numbers, orders and guests. A failure here keeps the event on screen with a note. */
  const loadSales = useCallback(async (id: string) => {
    const [s, o, g] = await Promise.all([
      call("GET", `/api/events/${id}/summary`),
      call("GET", `/api/events/${id}/orders`),
      call("GET", `/api/events/${id}/door/guests`),
    ]);
    if (!s || !o || !g) return;
    let err: string | null = null;
    if (s.status === 200 && s.body?.success && isSummary(s.body)) setSummary(s.body);
    else { setSummary(null); err = errorCopy(s.status, s.body); }
    if (o.status === 200 && o.body?.success && Array.isArray(o.body.orders)) setOrders((o.body.orders as unknown[]).filter(isHostOrder));
    else { setOrders([]); err = err ?? errorCopy(o.status, o.body); }
    if (g.status === 200 && g.body?.success && Array.isArray(g.body.guests)) setGuests((g.body.guests as unknown[]).filter(isDoorGuest));
    else { setGuests([]); err = err ?? errorCopy(g.status, g.body); }
    setSalesError(err);
  }, [call]);

  const load = useCallback(async () => {
    setScreen("loading");
    setLoadError(null);
    const r = await call("GET", `/api/events/${eventId}/manage`);
    if (!r) return;
    if (r.status === 404) { setScreen("notfound"); return; }
    if (r.status !== 200 || !r.body?.success || !isHostEvent(r.body.event)) {
      setLoadError(errorCopy(r.status, r.body));
      setScreen("error");
      return;
    }
    const e = r.body.event as HostEvent;
    setEvent(e);
    setTypes(Array.isArray(r.body.ticketTypes) ? (r.body.ticketTypes as unknown[]).filter(isHostTicketType) : []);
    setScreen("ready");
    if (e.status !== "draft") await loadSales(eventId);
  }, [call, eventId, loadSales]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => typeRows(types, summary), [types, summary]);
  const refundable = useMemo(() => refundableOrders(orders, event?.status ?? ""), [orders, event]);

  async function copyLink() {
    if (!event) return;
    try {
      await navigator.clipboard.writeText(shareUrl(event.slug));
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  }

  async function doCancel() {
    if (!event || cancelling) return;
    setCancelling(true);
    setCancelError(null);
    const r = await call("POST", `/api/events/${event.id}/cancel`, {});
    setCancelling(false);
    if (!r) return;
    if (r.status !== 200 || !r.body?.success) { setCancelError(backendMessage(r.body)); return; }
    setConfirmCancel(false);
    setNotice(cancelNotice(r.body.guests));
    const m = await call("GET", `/api/events/${event.id}/manage`);
    if (m && m.status === 200 && isHostEvent(m.body?.event)) {
      setEvent(m.body.event as HostEvent);
      setTypes(Array.isArray(m.body.ticketTypes) ? (m.body.ticketTypes as unknown[]).filter(isHostTicketType) : []);
    } else {
      setEvent({ ...event, status: "cancelled" });
    }
    await loadSales(event.id);
  }

  async function doRefund(o: HostOrder) {
    if (!event || refunding) return;
    setRefunding(true);
    setRefundError(null);
    const r = await call("POST", `/api/events/${event.id}/orders/${o.id}/refund`);
    setRefunding(false);
    if (!r) return;
    if (r.status !== 200 || !r.body?.success) { setRefundError(backendMessage(r.body)); return; }
    setRefundId(null);
    setNotice(`Refund started for ${guestName(o.guest)}.`);
    await loadSales(event.id);
  }

  const page = (inner: React.ReactNode) => (
    <main className="ed-page">
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{EDITOR_CSS + MANAGE_CSS}</style>
      <div className="ed-wrap">{inner}</div>
    </main>
  );

  if (screen === "loading") return page(<div className="ed-muted" role="status">Loading.</div>);

  if (screen === "notfound") {
    return page(
      <div className="ed-card-msg" role="alert" data-testid="not-found">
        <h1 className="ed-h1">EVENT NOT FOUND</h1>
        <p className="ed-text">Event not found. It may have been removed, or it belongs to another account.</p>
        <Link href="/events/mine" className="ed-primary ed-auto">Your events</Link>
      </div>,
    );
  }

  if (screen === "error" || !event) {
    return page(
      <div className="ed-card-msg" role="alert">
        <h1 className="ed-h1">EVENTS</h1>
        <p className="ed-text">{loadError ?? GENERIC_ERROR}</p>
        <div className="ed-row-actions">
          <button type="button" className="ed-primary ed-auto" onClick={load}>Try again</button>
          <Link href="/events/mine" className="ed-link">Your events</Link>
        </div>
      </div>,
    );
  }

  const label = statusLabel(event);
  const chipClass = event.status === "draft" ? "draft" : event.status === "cancelled" ? "cancelled" : label === "ENDED" ? "ended" : "";
  const isDraft = event.status === "draft";
  const live = event.status === "published";
  const earnings = summary ? summary.totals.hostEarningsCents : 0;
  const payout = summary ? payoutCard(summary.payout, event.timezone, earnings) : null;
  const refunded = summary ? refundedLine(summary.totals) : null;
  const shownGuests = showAllGuests ? guests : guests.slice(0, GUEST_PREVIEW);

  return page(
    <>
      <header className="mg-head">
        <Link href="/events/mine" className="ed-icon-btn" aria-label="Back to your events">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <h2 className="mg-head-h" style={{ fontSize: 22 }}>MANAGE EVENT</h2>
      </header>
      <div className="mg-body">
        {notice && <p className="ed-ok" role="status">{notice}</p>}

        <div className="ed-stack-sm">
          <div className={`mg-chip ${chipClass}`} data-testid="status">{label}</div>
          <h1 className="mg-title">{event.title}</h1>
          <div className="mg-sub">{whenWhere(event)}</div>
        </div>

        <div className="mg-toprow">
          {event.status !== "cancelled" && <Link href={`/events/${event.id}/edit`} className="ed-outline">Edit</Link>}
          <Link href={`/e/${event.slug}`} className="ed-outline">View page</Link>
          {!isDraft && event.status !== "cancelled" && (
            <button type="button" className="ed-outline" style={{ background: "transparent", color: "#F5F0E6", cursor: "pointer", font: "600 14px 'Hanken Grotesk', sans-serif" }} onClick={copyLink}>
              {copied === "yes" ? "Link copied" : "Share link"}
            </button>
          )}
        </div>
        {copied === "no" && <p className="ed-hint" role="status">Couldn&apos;t copy. The link is {shareUrl(event.slug)}</p>}

        {isDraft && (
          <p className="ed-hint">This event is a draft. Finish it in the editor to publish it. Guests can&apos;t see it yet.</p>
        )}

        {!isDraft && (
          <>
            {salesError && (
              <p className="ed-err" role="alert">
                {salesError} <button type="button" className="ed-textbtn ed-inline-btn" onClick={() => loadSales(event.id)}>Try again</button>
              </p>
            )}

            <div className="mg-stats">
              <div className="mg-stat">
                <div className="mg-stat-label">Tickets taken</div>
                <div className="mg-stat-big" data-testid="taken">{takenLine(event.takenCount, event.capacity)}</div>
              </div>
              <div className="mg-stat">
                <div className="mg-stat-label">Your earnings</div>
                <div className="mg-stat-big mg-gold" data-testid="earnings">{summary ? money(earnings) : "$0.00"}</div>
                {summary && <div className="mg-stat-hint">{earningsHint(summary.payout)}</div>}
              </div>
              <div className="mg-stat">
                <div className="mg-stat-label">Paid to your bank</div>
                <div className="mg-stat-mid">{payout ? payout.value : "Not scheduled"}</div>
                {payout?.hint && <div className="mg-stat-hint">{payout.hint}</div>}
              </div>
              <div className="mg-stat">
                <div className="mg-stat-label">Refunded</div>
                <div className="mg-stat-mid">{refunded ? refunded.value : "$0.00"}</div>
                {refunded?.hint && <div className="mg-stat-hint">{refunded.hint}</div>}
              </div>
            </div>
          </>
        )}

        <section className="ed-stack-sm" aria-label="Ticket types">
          <h2 className="mg-section">TICKET TYPES</h2>
          {rows.length === 0 && <div className="mg-sub">No ticket types yet.</div>}
          {rows.map((r) => (
            <div key={r.id} className="ed-stack-sm" style={{ gap: 6 }} data-testid="type-row">
              <div className="mg-trow"><div>{r.name}{r.hidden ? " (hidden)" : ""}</div><div>{typeRowText(r)}</div></div>
              <div className="mg-bar" role="img" aria-label={`${r.pct} percent taken`}><div style={{ width: `${r.pct}%` }} /></div>
            </div>
          ))}
        </section>

        {!isDraft && (
          <section aria-label="Guests" data-testid="guests">
            <div className="mg-sechead">
              <h2 className="mg-section">GUESTS{guests.length > 0 ? ` (${checkedInCount(guests)} of ${guests.length} checked in)` : ""}</h2>
              {guests.length > GUEST_PREVIEW && (
                <button type="button" className="ed-textbtn ed-gold" onClick={() => setShowAllGuests((v) => !v)}>{showAllGuests ? "Show fewer" : "See all"}</button>
              )}
            </div>
            {guests.length === 0 ? (
              <div className="mg-sub" style={{ paddingTop: 8 }}>No guests yet.</div>
            ) : (
              <ul className="mg-list">
                {shownGuests.map((g) => (
                  <li key={g.ticketId} className="mg-li" data-testid="guest-row">
                    <div className="mg-li-main">
                      <div className="mg-li-name">{guestName(g)}</div>
                      <div className="mg-li-sub">{guestLine(g)}</div>
                    </div>
                    {g.checkedInAt && <span className="mg-in">Checked in</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {refundable.length > 0 && (
          <section aria-label="Paid orders" data-testid="orders">
            <h2 className="mg-section">PAID ORDERS</h2>
            <ul className="mg-list">
              {refundable.map((o) => (
                <li key={o.id} className="mg-li" style={{ flexWrap: "wrap" }}>
                  <div className="mg-li-main">
                    <div className="mg-li-name">{guestName(o.guest)}</div>
                    <div className="mg-li-sub">{[guestHandle(o.guest), orderLine(o)].filter(Boolean).join(" · ")}</div>
                  </div>
                  {refundId !== o.id && (
                    <button type="button" className="mg-small" disabled={refunding} onClick={() => { setRefundId(o.id); setRefundError(null); }}>Refund</button>
                  )}
                  {refundId === o.id && (
                    <div className="mg-confirm" style={{ flexBasis: "100%" }} role="group" aria-label="Confirm refund">
                      <p>{refundConfirmCopy(o)}</p>
                      {refundError && <p className="ed-err" role="alert">{refundError}</p>}
                      <div className="mg-confirm-actions">
                        <button type="button" className="mg-danger" disabled={refunding} onClick={() => doRefund(o)}>{refunding ? "Refunding." : "Yes, refund"}</button>
                        <button type="button" className="mg-small" disabled={refunding} onClick={() => { setRefundId(null); setRefundError(null); }}>Keep order</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mg-actions">
          {live && (
            <div className="mg-quick">
              <Link href={`/events/${event.id}/team`} className="ed-outline">Door team</Link>
              <Link href={`/events/${event.id}/scan`} className="ed-primary" style={{ minHeight: 48 }}>Scan tickets</Link>
            </div>
          )}
          {canCancel(event) && !confirmCancel && (
            <button type="button" className="mg-cancel-link" onClick={() => { setConfirmCancel(true); setCancelError(null); }}>Cancel event</button>
          )}
          {confirmCancel && (
            <div className="mg-confirm" role="group" aria-label="Confirm cancel event" data-testid="cancel-confirm">
              <p>{CANCEL_CONFIRM_COPY}</p>
              {cancelError && <p className="ed-err" role="alert">{cancelError}</p>}
              <div className="mg-confirm-actions">
                <button type="button" className="mg-danger" disabled={cancelling} onClick={doCancel}>{cancelling ? "Cancelling." : "Yes, cancel event"}</button>
                <button type="button" className="mg-small" disabled={cancelling} onClick={() => { setConfirmCancel(false); setCancelError(null); }}>Keep event</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
  );
}
