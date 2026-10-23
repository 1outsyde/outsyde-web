"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GENERIC_ERROR, errorCopy } from "../e/_shared/format";
import {
  buildQuery, isEventCard, priceLabel, whenLabel, whereLabel,
  type Coords, type EventCard, type Filters, type WhenFilter,
} from "./eventsLogic";

const HOST_HREF = "/events/new";
const HOST_LOGIN = "/login?return=/events/new";
const TINTS = ["#1A3C34", "#2A2418", "#1F2A3C", "#3C1A2E", "#2E3C1A", "#3C2E1A"];

type Auth = "loading" | "in" | "out";

function browserZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}

export default function EventsClient() {
  const [filters, setFilters] = useState<Filters>({ near: false, free: false, when: null });
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [locNote, setLocNote] = useState<string | null>(null);
  const [events, setEvents] = useState<EventCard[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [auth, setAuth] = useState<Auth>("loading");
  const [now, setNow] = useState<Date>(() => new Date());
  const seq = useRef(0);

  useEffect(() => {
    let live = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { authenticated?: boolean }) => { if (live) setAuth(d?.authenticated ? "in" : "out"); })
      .catch(() => { if (live) setAuth("out"); });
    return () => { live = false; };
  }, []);

  const load = useCallback(async (f: Filters, c: Coords | null, after: string | null) => {
    const id = ++seq.current;
    const at = new Date();
    if (after) setMore(true); else { setEvents(null); setCursor(null); }
    setError(null);
    try {
      const qs = buildQuery({ filters: f, now: at, tz: browserZone(), coords: c, cursor: after });
      const res = await fetch(`/api/events?${qs}`, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (id !== seq.current) return;
      if (!res.ok || !body?.success || !Array.isArray(body.events)) {
        setError(errorCopy(res.status, body));
        if (!after) setEvents([]);
        return;
      }
      const page = (body.events as unknown[]).filter(isEventCard);
      setNow(at);
      setEvents((prev) => (after && prev ? [...prev, ...page] : page));
      setCursor(typeof body.nextCursor === "string" ? body.nextCursor : null);
    } catch {
      if (id !== seq.current) return;
      setError(GENERIC_ERROR);
      if (!after) setEvents([]);
    } finally {
      if (id === seq.current) setMore(false);
    }
  }, []);

  useEffect(() => { load(filters, coords, null); }, [filters, coords, load]);

  function toggleWhen(w: Exclude<WhenFilter, null>) {
    setFilters((f) => ({ ...f, when: f.when === w ? null : w }));
  }

  function toggleNear() {
    if (filters.near) {
      setFilters((f) => ({ ...f, near: false }));
      setLocNote(null);
      return;
    }
    setLocNote(null);
    if (coords) { setFilters((f) => ({ ...f, near: true })); return; }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocNote("Your browser can't share a location, so the list shows every event.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setFilters((f) => ({ ...f, near: true }));
      },
      () => {
        setLocating(false);
        setLocNote("We couldn't get your location, so the list shows every event. Allow location access to see events near you.");
      },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }

  const chip = (label: string, on: boolean, onClick: () => void, busy = false) => (
    <button type="button" className={`ev-chip${on ? " on" : ""}`} aria-pressed={on} onClick={onClick} disabled={busy}>{label}</button>
  );

  return (
    <main className="ev-page">
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{CSS}</style>
      <div className="ev-wrap">
        <div className="ev-top">
          <h1 className="ev-h1">EVENTS</h1>
          <div className="ev-actions">
            <Link href="/tickets" className="ev-btn ghost">My Tickets</Link>
            {auth === "in" && <Link href="/events/mine" className="ev-btn ghost">Your events</Link>}
            <Link href={auth === "out" ? HOST_LOGIN : HOST_HREF} className="ev-btn gold">Host an event</Link>
          </div>
        </div>

        <div className="ev-chips" role="group" aria-label="Filter events">
          {chip(locating ? "Finding you" : "Near me", filters.near, toggleNear, locating)}
          {chip("Tonight", filters.when === "tonight", () => toggleWhen("tonight"))}
          {chip("This weekend", filters.when === "weekend", () => toggleWhen("weekend"))}
          {chip("Free", filters.free, () => setFilters((f) => ({ ...f, free: !f.free })))}
        </div>
        {locNote && <p className="ev-note" role="status">{locNote}</p>}

        {error && (
          <p className="ev-note" role="alert">
            {error} <button type="button" className="ev-link" onClick={() => load(filters, coords, null)}>Try again</button>
          </p>
        )}

        {events === null && <p className="ev-muted">Loading events.</p>}

        {events !== null && events.length === 0 && !error && (
          <div className="ev-empty">
            <div className="ev-empty-title">NO EVENTS FOUND</div>
            <p className="ev-muted">
              {filters.near || filters.free || filters.when
                ? "Nothing matches those filters right now. Try turning one off."
                : "There are no upcoming events yet. Be the first to host one."}
            </p>
          </div>
        )}

        {events !== null && events.length > 0 && (
          <div className="ev-grid">
            {events.map((e, i) => {
              const where = whereLabel(e);
              const price = priceLabel(e);
              return (
                <Link key={e.id} href={`/e/${e.slug}`} className="ev-card">
                  <div className="ev-cover" style={e.coverImageUrl ? undefined : { background: TINTS[i % TINTS.length] }}>
                    {e.coverImageUrl && <img src={e.coverImageUrl} alt="" loading="lazy" />}
                  </div>
                  <div className="ev-body">
                    <div className="ev-when">{whenLabel(e, now)}</div>
                    <div className="ev-title">{e.title}</div>
                    {where && <div className="ev-where">{where}</div>}
                    {price && <div className="ev-price">{price}</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {cursor && (
          <div className="ev-more">
            <button type="button" className="ev-btn ghost" onClick={() => load(filters, coords, cursor)} disabled={more}>
              {more ? "Loading" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

const CSS = `
.ev-page{min-height:100vh;background:#0B0B0B;color:#F5F0E6;font-family:'Hanken Grotesk',system-ui,sans-serif}
.ev-wrap{max-width:1200px;margin:0 auto;padding:24px 16px 64px;box-sizing:border-box;display:flex;flex-direction:column;gap:20px}
.ev-top{display:flex;align-items:center;justify-content:space-between;gap:12px 16px;flex-wrap:wrap}
.ev-h1{font-family:'Bebas Neue',sans-serif;font-size:40px;letter-spacing:1.5px;font-weight:400;margin:0;line-height:1}
.ev-actions{display:flex;gap:8px;flex-wrap:wrap}
.ev-btn{min-height:44px;padding:0 18px;border-radius:22px;display:inline-flex;align-items:center;justify-content:center;font:600 14px 'Hanken Grotesk',sans-serif;text-decoration:none;box-sizing:border-box;cursor:pointer}
.ev-btn.ghost{border:1px solid #2A2A2A;background:transparent;color:#F5F0E6}
.ev-btn.gold{border:1px solid #E8B930;background:#E8B930;color:#0B0B0B}
.ev-btn:disabled{opacity:.6;cursor:default}
.ev-chips{display:flex;gap:8px;flex-wrap:wrap}
.ev-chip{min-height:44px;padding:0 16px;border-radius:22px;border:1px solid #2A2A2A;background:#161616;color:#F5F0E6;font:600 14px 'Hanken Grotesk',sans-serif;cursor:pointer}
.ev-chip.on{border-color:#E8B930;background:#E8B930;color:#0B0B0B}
.ev-chip:disabled{opacity:.7;cursor:default}
.ev-note{margin:0;color:#B8B0A0;font-size:14px;line-height:1.45}
.ev-muted{margin:0;color:#A0A0A0;font-size:14px;line-height:1.45}
.ev-link{background:none;border:0;padding:0 8px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;color:#E8B930;font:600 14px 'Hanken Grotesk',sans-serif;cursor:pointer;text-decoration:underline}
.ev-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px}
.ev-card{display:block;color:#F5F0E6;background:#141414;border:1px solid #2A2A2A;border-radius:18px;overflow:hidden;text-decoration:none;min-width:0}
.ev-card:hover{border-color:#38383A}
.ev-cover{height:170px;background:#1A3C34;overflow:hidden}
.ev-cover img{width:100%;height:100%;object-fit:cover;display:block}
.ev-body{padding:14px 16px 16px;display:flex;flex-direction:column;gap:5px}
.ev-when{font-size:12px;font-weight:700;color:#E8B930;letter-spacing:.5px}
.ev-title{font-family:'Bebas Neue',sans-serif;font-size:24px;line-height:1.05;overflow-wrap:anywhere}
.ev-where{font-size:13px;color:#B8B0A0;overflow-wrap:anywhere}
.ev-price{font-size:14px;font-weight:600;margin-top:4px}
.ev-empty{border:1px solid #2A2A2A;background:#141414;border-radius:18px;padding:28px 20px;text-align:center}
.ev-empty-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;margin-bottom:6px}
.ev-more{display:flex;justify-content:center}
@media (max-width:480px){.ev-h1{font-size:34px}.ev-actions{width:100%}.ev-actions .ev-btn{flex:1 1 auto}}
`;
