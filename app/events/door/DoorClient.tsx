"use client";

/** Events I can scan: GET /door/mine (published events that haven't ended, where I'm the host or on the door team). */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HostShell, useHostApi } from "../_host/hostApi";
import { MANAGE_CSS } from "../_host/manageStyles";
import { whenRange } from "../_host/editorLogic";
import { errorCopy } from "../../e/_shared/format";
import { isDoorEvent, roleLabel, scanWindowNote, type DoorEvent } from "../[id]/scan/scanLogic";

export default function DoorClient() {
  const { call } = useHostApi();
  const [events, setEvents] = useState<DoorEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await call("GET", "/api/events/door/mine");
    if (!r) return;
    if (r.status !== 200 || !r.body?.success || !Array.isArray(r.body.events)) { setError(errorCopy(r.status, r.body)); return; }
    setEvents((r.body.events as unknown[]).filter(isDoorEvent));
  }, [call]);

  useEffect(() => { load(); }, [load]);

  return (
    <HostShell css={MANAGE_CSS}>
      <header className="mg-head">
        <Link href="/events" className="ed-icon-btn" aria-label="Back to events">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <h1 className="mg-head-h">SCAN TICKETS</h1>
      </header>
      <div className="mg-body">
        {events === null && !error && <div className="ed-muted" role="status">Loading your events.</div>}
        {error && (
          <div className="ed-err" role="alert">
            {error} <button type="button" className="ed-textbtn ed-inline-btn" onClick={load}>Try again</button>
          </div>
        )}
        {events !== null && events.length === 0 && (
          <div className="ed-card-msg">
            <h2 className="ed-h1">NOTHING TO SCAN</h2>
            <p className="ed-text">When you host an event, or a host adds you to their door team, the event shows up here until it ends.</p>
            <Link href="/events" className="ed-primary ed-auto">Browse events</Link>
          </div>
        )}
        {events !== null && events.length > 0 && (
          <section className="mg-group" aria-label="Events you can scan" data-testid="door-events">
            {events.map((e) => {
              const note = scanWindowNote(e);
              return (
                <Link key={e.id} href={`/events/${e.id}/scan`} className="mg-evrow" data-testid="door-row">
                  <div className="mg-evrow-main">
                    <div className="mg-evrow-title">{e.title}</div>
                    <div className="mg-sub">{whenRange(e.startsAt, e.endsAt, e.timezone)}</div>
                    <div className="mg-sub">{note ?? "Check in is open."}</div>
                  </div>
                  <div className="mg-evrow-side">{roleLabel(e.role)}</div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </HostShell>
  );
}
