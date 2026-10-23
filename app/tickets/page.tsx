"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  buildIcs, directionsUrl, errorCopy, groupByEvent, icsFileName, placeInfo, splitSections, whenLine, GENERIC_ERROR,
  type MyTicket,
} from "./ticketsLogic";

const LOGIN = "/login?return=/tickets";

type Panel =
  | { step: "loading" }
  | { step: "ready"; orderId: string; free: boolean }
  | { step: "confirm"; orderId: string; free: boolean }
  | { step: "sending"; orderId: string; free: boolean }
  | { step: "error"; message: string; orderId?: string; free?: boolean };

function downloadIcs(t: MyTicket) {
  try {
    const blob = new Blob([buildIcs(t)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = icsFileName(t.event);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* nothing useful to tell the person; the browser blocked the download */
  }
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<MyTicket[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [panels, setPanels] = useState<Record<string, Panel | undefined>>({});

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/events/me/tickets", { cache: "no-store" });
      if (res.status === 401) { router.replace(LOGIN); return; }
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success || !Array.isArray(body.tickets)) { setLoadError(errorCopy(body)); return; }
      setTickets(body.tickets as MyTicket[]);
    } catch {
      setLoadError(GENERIC_ERROR);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const setPanel = (id: string, p: Panel | undefined) => setPanels((prev) => ({ ...prev, [id]: p }));

  async function openPanel(t: MyTicket) {
    if (panels[t.id]) { setPanel(t.id, undefined); return; }
    setPanel(t.id, { step: "loading" });
    try {
      const res = await fetch(`/api/events/orders/${t.orderId}`, { cache: "no-store" });
      if (res.status === 401) { router.replace(LOGIN); return; }
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success || typeof body.order?.totalCents !== "number") { setPanel(t.id, { step: "error", message: errorCopy(body) }); return; }
      setPanel(t.id, { step: "ready", orderId: t.orderId, free: body.order.totalCents === 0 });
    } catch {
      setPanel(t.id, { step: "error", message: GENERIC_ERROR });
    }
  }

  async function submit(t: MyTicket, orderId: string, free: boolean) {
    setPanel(t.id, { step: "sending", orderId, free });
    try {
      const res = await fetch(`/api/events/orders/${orderId}/${free ? "cancel" : "refund"}`, { method: "POST" });
      if (res.status === 401) { router.replace(LOGIN); return; }
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) { setPanel(t.id, { step: "error", message: errorCopy(body), orderId, free }); return; }
      setTickets((prev) => (prev ? prev.filter((x) => x.orderId !== orderId) : prev));
      setPanels({});
      setNotice(free ? "Your RSVP is cancelled." : "Your refund is on its way.");
    } catch {
      setPanel(t.id, { step: "error", message: GENERIC_ERROR, orderId, free });
    }
  }

  const sections = useMemo(() => splitSections(tickets ?? []), [tickets]);
  const upcomingGroups = useMemo(() => groupByEvent(sections.upcoming), [sections]);
  const pastGroups = useMemo(() => groupByEvent(sections.past), [sections]);

  return (
    <main className="tk-page">
      <style>{CSS}</style>
      <div className="tk-wrap">
        <header className="tk-head">
          <Link href="/" aria-label="Back to home" className="tk-back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <h1 className="tk-h1">MY TICKETS</h1>
        </header>

        {notice && <div className="tk-notice" role="status">{notice}</div>}

        {tickets === null && !loadError && <div className="tk-muted" style={{ padding: "24px 0" }}>Loading your tickets.</div>}
        {loadError && (
          <div className="tk-muted" style={{ padding: "24px 0" }} role="alert">
            {loadError} <button type="button" className="tk-link" onClick={load}>Try again</button>
          </div>
        )}

        {tickets !== null && tickets.length === 0 && (
          <div className="tk-empty">
            <div className="tk-title">No tickets yet.</div>
            <p className="tk-muted" style={{ margin: "6px 0 14px" }}>When you RSVP or buy a ticket, it shows up here.</p>
            <Link href="/" className="tk-gold">Browse what is coming up</Link>
          </div>
        )}

        {upcomingGroups.length > 0 && (
          <section aria-label="Coming up" className="tk-col">
            <div className="tk-label">COMING UP</div>
            {upcomingGroups.map((g) =>
              g.tickets.map((t, i) => {
                const place = placeInfo(t.event);
                const dir = directionsUrl(t.event);
                const panel = panels[t.id];
                return (
                  <div key={t.id} className="tk-block">
                    <article className="tk-card">
                      {t.event.coverImageUrl ? (
                        <img className="tk-cover" src={t.event.coverImageUrl} alt="" />
                      ) : (
                        <div className="tk-cover tk-cover-plain" aria-hidden="true" />
                      )}
                      <div className="tk-info">
                        <h2 className="tk-title"><Link href={`/e/${t.event.slug}`}>{t.event.title}</Link></h2>
                        {t.event.status === "cancelled" && <div className="tk-cancelled">Event cancelled</div>}
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{whenLine(t.event)}</div>
                        <div className="tk-place">
                          {place.lines.length > 0 && <div>{place.lines.join(", ")}</div>}
                          {place.note && <div>{place.note}</div>}
                        </div>
                      </div>
                      <div className="tk-qrbox">
                        {t.qrUrl ? (
                          <img src={t.qrUrl} alt="Ticket QR code" width={200} height={200} className="tk-qr" />
                        ) : (
                          <div className="tk-qr tk-qr-missing">Your QR code is on its way. Check back soon.</div>
                        )}
                        <div className="tk-code">{t.code}</div>
                        <div className="tk-small">
                          {t.ticketTypeName}{g.tickets.length > 1 ? ` · Ticket ${i + 1} of ${g.tickets.length}` : ""}
                        </div>
                        {t.checkedInAt && <span className="tk-badge">Checked in</span>}
                        {t.walletUrl && <a href={t.walletUrl} className="tk-wallet">Add to Apple Wallet</a>}
                      </div>
                      <div className="tk-actions" style={{ gridTemplateColumns: dir ? "1fr 1fr" : "1fr" }}>
                        {dir && <a href={dir} target="_blank" rel="noopener noreferrer" className="tk-act tk-act-l">Directions</a>}
                        <button type="button" className="tk-act" onClick={() => downloadIcs(t)}>Add to calendar</button>
                      </div>
                    </article>

                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button type="button" className="tk-link" onClick={() => openPanel(t)} aria-expanded={!!panel}>Can't make it?</button>
                    </div>

                    {panel && (
                      <div className="tk-panel">
                        {panel.step === "loading" && <div className="tk-muted">Checking your order.</div>}
                        {panel.step === "error" && (
                          <>
                            <div className="tk-err" role="alert">{panel.message}</div>
                            {panel.message === GENERIC_ERROR && panel.orderId && panel.free !== undefined && (
                              <button type="button" className="tk-btn" onClick={() => setPanel(t.id, { step: "confirm", orderId: panel.orderId!, free: panel.free! })}>Try again</button>
                            )}
                          </>
                        )}
                        {panel.step === "ready" && (
                          <>
                            <div className="tk-muted">{panel.free ? "Plans changed? Let the host know you are not coming." : "Plans changed? You can ask for a refund if the host's policy allows it."}</div>
                            <button type="button" className="tk-btn" onClick={() => setPanel(t.id, { step: "confirm", orderId: panel.orderId, free: panel.free })}>
                              {panel.free ? "Cancel my RSVP" : "Request a refund"}
                            </button>
                          </>
                        )}
                        {(panel.step === "confirm" || panel.step === "sending") && (
                          <>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                              {panel.free ? `Cancel your RSVP for ${t.event.title}?` : `Request a refund for ${t.event.title}?`}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button type="button" className="tk-btn" disabled={panel.step === "sending"} onClick={() => submit(t, panel.orderId, panel.free)}>
                                {panel.step === "sending" ? "Working on it." : panel.free ? "Yes, cancel" : "Yes, request refund"}
                              </button>
                              <button type="button" className="tk-btn tk-btn-quiet" disabled={panel.step === "sending"} onClick={() => setPanel(t.id, undefined)}>Keep my ticket</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              }),
            )}
          </section>
        )}

        {pastGroups.length > 0 && (
          <details className="tk-past">
            <summary>Past ({sections.past.length})</summary>
            <div className="tk-col" style={{ marginTop: 10 }}>
              {pastGroups.map((g) => (
                <div key={g.event.id} className="tk-row">
                  {g.event.coverImageUrl ? <img className="tk-thumb" src={g.event.coverImageUrl} alt="" /> : <div className="tk-thumb" aria-hidden="true" />}
                  <div style={{ minWidth: 0 }}>
                    <div className="tk-rowdate">{whenLine(g.event).toUpperCase()}</div>
                    <div className="tk-rowtitle"><Link href={`/e/${g.event.slug}`}>{g.event.title}</Link></div>
                    <div className="tk-small-d">{g.tickets.length} {g.tickets.length === 1 ? "ticket" : "tickets"}</div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </main>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
body{background:#0B0B0B;margin:0}
.tk-page{min-height:100vh;background:#0B0B0B;color:#F5F0E6;font-family:'Hanken Grotesk',system-ui,sans-serif}
.tk-wrap{max-width:480px;margin:0 auto;padding:16px 20px 60px;box-sizing:border-box}
.tk-head{display:flex;align-items:center;gap:12px;padding-bottom:12px}
.tk-back{width:44px;height:44px;border-radius:22px;background:#161616;color:#F5F0E6;display:flex;align-items:center;justify-content:center}
.tk-h1{font-family:'Bebas Neue',sans-serif;font-size:32px;line-height:1;margin:0;font-weight:400}
.tk-page a{color:#E8B930;text-decoration:none}
.tk-col{display:flex;flex-direction:column;gap:14px}
.tk-label{font-size:12px;font-weight:700;color:#B8B0A0;letter-spacing:1px}
.tk-muted{font-size:14px;color:#B8B0A0}
.tk-block{display:flex;flex-direction:column;gap:6px}
.tk-card{background:#F5F0E6;color:#0B0B0B;border-radius:22px;overflow:hidden}
.tk-cover{display:block;width:100%;height:92px;object-fit:cover}
.tk-cover-plain{background:#1A3C34}
.tk-info{padding:16px 18px 6px;display:flex;flex-direction:column;gap:4px}
.tk-title{font-family:'Bebas Neue',sans-serif;font-size:28px;line-height:1;margin:0;font-weight:400;overflow-wrap:anywhere}
.tk-card .tk-title a{color:#0B0B0B}
.tk-cancelled{font-size:12px;font-weight:700;color:#9B2C2C}
.tk-place{font-size:13px;color:#4A453C;display:flex;flex-direction:column;gap:2px}
.tk-qrbox{padding:14px 18px 12px;display:flex;flex-direction:column;align-items:center;gap:10px}
.tk-qr{width:200px;height:200px;max-width:100%;background:#F5F0E6;display:block}
.tk-qr-missing{display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;color:#4A453C;border:1px dashed #B8B0A0;box-sizing:border-box;padding:16px}
.tk-code{font-size:13px;font-weight:700;letter-spacing:2px;overflow-wrap:anywhere;text-align:center}
.tk-small{font-size:12px;color:#4A453C;text-align:center}
.tk-badge{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1A3C34;border:1px solid #1A3C34;border-radius:999px;padding:4px 12px}
.tk-wallet{height:44px;padding:0 18px;border-radius:10px;background:#000;display:flex;align-items:center;font:600 14px 'Hanken Grotesk',sans-serif}
.tk-page .tk-wallet{color:#fff}
.tk-actions{display:grid;border-top:1px dashed #B8B0A0}
.tk-act{height:50px;border:0;background:transparent;font:600 14px 'Hanken Grotesk',sans-serif;display:flex;align-items:center;justify-content:center;cursor:pointer}
.tk-page .tk-act,.tk-act{color:#0B0B0B}
.tk-act-l{border-right:1px solid #DDD4C2}
.tk-link{min-height:44px;padding:0 16px;border:0;background:transparent;color:#B8B0A0;font:500 13px 'Hanken Grotesk',sans-serif;text-decoration:underline;cursor:pointer}
.tk-panel{background:#141414;border:1px solid #2A2A2A;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px}
.tk-btn{min-height:44px;padding:0 16px;border-radius:12px;border:0;background:#E8B930;color:#0B0B0B;font:700 14px 'Hanken Grotesk',sans-serif;cursor:pointer}
.tk-btn:disabled{opacity:.6;cursor:default}
.tk-btn-quiet{background:#222;color:#F5F0E6}
.tk-err{font-size:14px;color:#ff8a8a}
.tk-notice{background:#10241F;border:1px solid #1A3C34;border-radius:14px;padding:12px 14px;font-size:14px;font-weight:600;margin-bottom:14px}
.tk-empty{background:#141414;border:1px solid #2A2A2A;border-radius:16px;padding:20px}
.tk-empty .tk-title{color:#F5F0E6}
.tk-gold{font-weight:600;font-size:14px}
.tk-past{margin-top:22px}
.tk-past summary{font-size:12px;font-weight:700;color:#B8B0A0;letter-spacing:1px;text-transform:uppercase;cursor:pointer;min-height:44px;display:flex;align-items:center}
.tk-row{display:flex;gap:12px;background:#141414;border:1px solid #2A2A2A;border-radius:16px;padding:10px;align-items:center}
.tk-thumb{width:60px;height:60px;border-radius:10px;background:#2E2A1E;flex-shrink:0;object-fit:cover}
.tk-rowdate{font-size:12px;font-weight:700;color:#E8B930}
.tk-rowtitle{font-family:'Bebas Neue',sans-serif;font-size:20px;line-height:1.1;overflow-wrap:anywhere}
.tk-small-d{font-size:12px;color:#B8B0A0}
`;
