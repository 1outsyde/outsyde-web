"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EDITOR_CSS } from "./editorStyles";
import { MANAGE_CSS } from "./manageStyles";
import { isHostEvent, type HostEvent } from "./editorLogic";
import { eventHref, groupMine, statusLabel, takenLine, whenWhere } from "./manageLogic";
import { errorCopy, GENERIC_ERROR } from "../../e/_shared/format";

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
  const router = useRouter();
  const [events, setEvents] = useState<HostEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/events/mine", { cache: "no-store" });
      if (res.status === 401) { router.replace(`/login?return=${encodeURIComponent(window.location.pathname)}`); return; }
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success || !Array.isArray(body.events)) { setError(errorCopy(res.status, body)); return; }
      setEvents((body.events as unknown[]).filter(isHostEvent));
    } catch {
      setError(GENERIC_ERROR);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => groupMine(events ?? []), [events]);
  const sections: { key: string; title: string; list: HostEvent[] }[] = [
    { key: "drafts", title: "DRAFTS", list: groups.drafts },
    { key: "upcoming", title: "UPCOMING", list: groups.upcoming },
    { key: "past", title: "PAST", list: groups.past },
    { key: "cancelled", title: "CANCELLED", list: groups.cancelled },
  ];

  return (
    <main className="ed-page">
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{EDITOR_CSS + MANAGE_CSS}</style>
      <div className="ed-wrap">
        <header className="mg-head">
          <Link href="/events" className="ed-icon-btn" aria-label="Back to events">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <h1 className="mg-head-h">YOUR EVENTS</h1>
          <Link href="/events/new" className="ed-primary ed-auto">Host an event</Link>
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
      </div>
    </main>
  );
}
