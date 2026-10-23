"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HostShell, useHostApi } from "./hostApi";
import { MANAGE_CSS } from "./manageStyles";
import { isHostEvent, type HostEvent } from "./editorLogic";
import { eventHref, groupMine, statusLabel, takenLine, whenWhere } from "./manageLogic";
import { errorCopy } from "../../e/_shared/format";

function EventRow({ e }: { e: HostEvent }) {
  const label = statusLabel(e);
  return (
    <Link href={eventHref(e)} className="mg-evrow" data-testid="mine-row">
      <div className="mg-evrow-main">
        <div className="mg-evrow-title">{e.title}</div>
        <div className="mg-sub">{whenWhere(e)}</div>
      </div>
      <div className="mg-evrow-side">
        <div>{label}</div>
        {e.status === "published" && <div>{takenLine(e.takenCount, e.capacity)} taken</div>}
      </div>
    </Link>
  );
}

export default function MineClient() {
  const { call } = useHostApi();
  const [events, setEvents] = useState<HostEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const r = await call("GET", "/api/events/mine");
    if (!r) return;
    if (r.status !== 200 || !r.body?.success || !Array.isArray(r.body.events)) { setError(errorCopy(r.status, r.body)); return; }
    setEvents((r.body.events as unknown[]).filter(isHostEvent));
  }, [call]);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => groupMine(events ?? []), [events]);
  const sections: { key: string; title: string; list: HostEvent[] }[] = [
    { key: "drafts", title: "DRAFTS", list: groups.drafts },
    { key: "upcoming", title: "UPCOMING", list: groups.upcoming },
    { key: "past", title: "PAST", list: groups.past },
    { key: "cancelled", title: "CANCELLED", list: groups.cancelled },
  ];
  const shownCount = sections.reduce((n, s) => n + s.list.length, 0);

  return (
    <HostShell css={MANAGE_CSS}>
        <header className="mg-head mg-head-wrap">
          <Link href="/events" className="ed-icon-btn" aria-label="Back to events">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <h1 className="mg-head-h">YOUR EVENTS</h1>
          <div className="mg-head-actions">
            <Link href="/events/door" className="ed-outline mg-head-btn">Scan tickets</Link>
            <Link href="/events/new" className="ed-primary ed-auto">Host an event</Link>
          </div>
        </header>
        <div className="mg-body">
          {events === null && !error && <div className="ed-muted" role="status">Loading your events…</div>}
          {error && (
            <div className="ed-err" role="alert">
              {error} <button type="button" className="ed-textbtn ed-inline-btn" onClick={load}>Try again</button>
            </div>
          )}
          {events !== null && shownCount === 0 && (
            <div className="ed-card-msg">
              <h2 className="ed-h1">NO EVENTS YET</h2>
              <p className="ed-text">Host your first event. Free RSVPs and paid tickets both work.</p>
              <Link href="/events/new" className="ed-primary ed-auto">Host an event</Link>
            </div>
          )}
          {events !== null && sections.filter((s) => s.list.length > 0).map((s) => (
            <section key={s.key} className="mg-group" aria-label={s.title} data-testid={`group-${s.key}`}>
              <h2 className="mg-section">{s.title}</h2>
              {s.list.map((e) => <EventRow key={e.id} e={e} />)}
            </section>
          ))}
        </div>
    </HostShell>
  );
}
