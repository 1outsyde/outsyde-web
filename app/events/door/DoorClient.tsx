"use client";

/**
 * Event team (p4-team step 8, mockup D). Step 9d-2: an invite that offers pay shows the Event Team note above one
 * "Accept and join" (join first, then the note: calls 79, 84); a failed note save leaves them on the team. The invite email's "Accept or decline" button opens this page
 * (goutsyde.com/events/door, kept so emails already sent still work).
 *   INVITES FOR YOU   GET /door/invites?roles=all: open invites for every role, with the pay offered.
 *   YOUR EVENTS       GET /door/mine?roles=all: events I host or am on the team for (upcoming, or ended in the last
 *                     14 days for the pay). Each row opens my page for that event, Scan for Admissions and co-hosts,
 *                     Manage for events I host or co-host.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HostShell, useHostApi } from "../_host/hostApi";
import { MANAGE_CSS } from "../_host/manageStyles";
import { whenRange } from "../_host/editorLogic";
import { backendMessage } from "../_host/manageLogic";
import { errorCopy } from "../../e/_shared/format";
import { isDoorInvite, scanWindowNote, type DoorInvite } from "../_host/doorLogic";
import { hasMemberPage, isCohosting, isTeamEvent, teamInviteHeadline, teamInviteLine, teamRolesLine, type TeamEvent } from "../_host/teamLogic";
import { TEAM_CSS } from "../_host/teamStyles";
import TeamNoteCard from "../_host/TeamNoteCard";
import { acceptLabel, isTeamNote, noteOnAccept, NOTE_SAVE_FAILED, type TeamNote } from "../_host/teamNoteLogic";

const INVITE_CSS = `
.dr-invite { background: #1C1C1E; border: 1px solid #E8B930; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.dr-invite-h { font-size: 15px; font-weight: 700; line-height: 1.35; margin: 0; overflow-wrap: anywhere; }
.dr-invite-p { font-size: 13px; color: #CFC7B8; line-height: 1.45; margin: 0; overflow-wrap: anywhere; }
.dr-invite-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.dr-invite-actions .ed-primary { min-height: 44px; font-size: 14px; }
.dr-invite-actions .mg-small { width: 100%; }
.dr-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
`;

type Invite = DoorInvite & { roleLabel?: string | null; pay?: unknown };

export default function DoorClient() {
  const { call } = useHostApi();
  const [events, setEvents] = useState<TeamEvent[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<{ id: string; text: string } | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);
  // The Event Team note (null until loaded or when it fails: joining still works, just without the card).
  const [note, setNote] = useState<TeamNote | null>(null);
  // Set before any await, so a double tap sends one request (state alone updates a render too late).
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    const [r, i, n] = await Promise.all([
      call("GET", "/api/events/door/mine?roles=all"), call("GET", "/api/events/door/invites?roles=all"), call("GET", "/api/events/team-note"),
    ]);
    setNote(n && n.status === 200 && isTeamNote(n.body?.note) ? n.body.note : null);
    if (!r) return;
    if (r.status !== 200 || !r.body?.success || !Array.isArray(r.body.events)) { setError(errorCopy(r.status, r.body)); return; }
    setEvents((r.body.events as unknown[]).filter(isTeamEvent));
    // Invites are extra: if that call fails the list still shows.
    setInvites(i && i.status === 200 && Array.isArray(i.body?.invites)
      ? (i.body.invites as unknown[]).filter(isDoorInvite).filter((x) => x.status === "invited") as Invite[]
      : []);
  }, [call]);

  useEffect(() => { load(); }, [load]);

  async function answer(inv: Invite, a: "accept" | "decline") {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(inv.id);
    setInviteError(null);
    setAnswered(null);
    const withNote = a === "accept" && noteOnAccept(inv.pay, note);
    const r = await call("POST", `/api/events/door/invites/${inv.id}/${a}?roles=all`);
    if (!r) { busyRef.current = false; setBusy(null); return; }
    if (r.status !== 200 || !r.body?.success) {
      busyRef.current = false;
      setBusy(null);
      setInviteError({ id: inv.id, text: backendMessage(r.status, r.body) });
      if (r.status === 409 || r.status === 404) load();
      return;
    }
    // Call 84: joined first; now the note. A failure here never undoes joining.
    const n = withNote && note ? await call("POST", "/api/events/team-note/accept", { version: note.version }) : null;
    busyRef.current = false;
    setBusy(null);
    const noteFailed = withNote && !(n && n.status === 200 && n.body?.success);
    setAnswered(a === "decline" ? `Invite declined. ${inv.host.name} can see you said no.`
      : noteFailed ? NOTE_SAVE_FAILED
      : inv.scope === "event" ? "You're on the Event team. The event is in your list below." : "You're on the Event team. Their events are in your list below.");
    await load();
  }

  const upcoming = (events ?? []).filter((e) => !e.ended);
  const past = (events ?? []).filter((e) => e.ended);

  const row = (e: TeamEvent) => {
    const note = e.canScan && !e.ended ? scanWindowNote(e) : null;
    const manage = e.role === "host" || isCohosting(e);
    return (
      <div key={e.id} className="tm-row" style={{ cursor: "default", flexWrap: "wrap" }} data-testid="door-row">
        <div style={{ minWidth: 0, flex: "1 1 220px" }}>
          <div className="tm-row-name">{e.title}</div>
          <div className="mg-sub">{whenRange(e.startsAt, e.endsAt, e.timezone)}</div>
          <div className="mg-sub">{teamRolesLine(e)}{e.canScan && !e.ended ? ` · ${note ?? "Check in is open."}` : ""}</div>
        </div>
        <div className="dr-actions">
          {hasMemberPage(e) && <Link className="mg-small" href={`/events/${e.id}/my-team`}>Open</Link>}
          {e.canScan && !e.ended && <Link className="mg-small" href={`/events/${e.id}/scan`}>Scan</Link>}
          {manage && <Link className="mg-small" href={`/events/${e.id}/manage`}>Manage</Link>}
        </div>
      </div>
    );
  };

  return (
    <HostShell css={MANAGE_CSS + TEAM_CSS + INVITE_CSS}>
      <header className="mg-head">
        <Link href="/events" className="ed-icon-btn" aria-label="Back to events">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <h1 className="mg-head-h">EVENT TEAM</h1>
      </header>
      <div className="mg-body">
        {events === null && !error && <div className="ed-muted" role="status">Loading your events…</div>}
        {error && (
          <div className="ed-err" role="alert">
            {error} <button type="button" className="ed-textbtn ed-inline-btn" onClick={load}>Try again</button>
          </div>
        )}

        {(invites.length > 0 || answered) && (
          <section className="mg-group" aria-label="Event team invites" data-testid="door-invites">
            <h2 className="mg-section">INVITES FOR YOU</h2>
            {invites.map((inv) => {
              const withNote = noteOnAccept(inv.pay, note);
              return (
              <div key={inv.id} className="dr-invite" data-testid="door-invite">
                <p className="dr-invite-h">{teamInviteHeadline(inv)}</p>
                <p className="dr-invite-p">{teamInviteLine(inv)}</p>
                {withNote && note && <TeamNoteCard note={note} testId="invite-note" />}
                {inviteError?.id === inv.id && <p className="ed-err" role="alert">{inviteError.text}</p>}
                <div className="dr-invite-actions">
                  <button type="button" className="ed-primary" disabled={busy !== null} onClick={() => answer(inv, "accept")} data-testid="invite-accept">{busy === inv.id ? "Saving…" : acceptLabel(withNote)}</button>
                  <button type="button" className="mg-small" disabled={busy !== null} onClick={() => answer(inv, "decline")}>Decline</button>
                </div>
              </div>
              );
            })}
            {answered && <p className="ed-ok" role="status">{answered}</p>}
          </section>
        )}

        {events !== null && events.length === 0 && (
          <div className="ed-card-msg">
            <h2 className="ed-h1">NOTHING HERE YET</h2>
            <p className="ed-text">When you host an event, or accept a host&apos;s Event team invite, the event shows up here.</p>
            <Link href="/events" className="ed-primary ed-auto">Browse events</Link>
          </div>
        )}
        {upcoming.length > 0 && (
          <section className="ed-stack-sm" style={{ gap: 6 }} aria-label="Your events" data-testid="door-events">
            <h2 className="mg-section">YOUR EVENTS</h2>
            {upcoming.map(row)}
          </section>
        )}
        {past.length > 0 && (
          <section className="ed-stack-sm" style={{ gap: 6 }} aria-label="Ended" data-testid="door-past">
            <h2 className="mg-section">RECENTLY ENDED</h2>
            {past.map(row)}
          </section>
        )}
      </div>
    </HostShell>
  );
}
