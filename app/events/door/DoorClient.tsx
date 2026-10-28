"use client";

/**
 * Door check in (mockup 40). Two parts:
 *   INVITES FOR YOU   GET /door/invites: open door team invites, each with Accept and Decline (backend 075)
 *   EVENTS YOU CAN SCAN   GET /door/mine: published events that haven't ended, where I'm the host or an accepted member.
 *                         A member row has Leave team (POST /door/invites/:inviteId/leave) with an inline confirm.
 * The invite email's "Accept or decline" button opens this page.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HostShell, useHostApi } from "../_host/hostApi";
import { MANAGE_CSS } from "../_host/manageStyles";
import { whenRange } from "../_host/editorLogic";
import { backendMessage } from "../_host/manageLogic";
import { errorCopy } from "../../e/_shared/format";
import {
  canLeave, inviteAnsweredCopy, inviteHeadline, inviteScopeLine, isDoorEvent, isDoorInvite, leaveConfirmCopy, roleLabel, scanWindowNote,
  type DoorEvent, type DoorInvite,
} from "../_host/doorLogic";

const INVITE_CSS = `
.dr-invite { background: #1C1C1E; border: 1px solid #E8B930; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.dr-invite-h { font-size: 15px; font-weight: 700; line-height: 1.35; margin: 0; overflow-wrap: anywhere; }
.dr-invite-p { font-size: 13px; color: #CFC7B8; line-height: 1.45; margin: 0; overflow-wrap: anywhere; }
.dr-invite-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.dr-invite-actions .ed-primary { min-height: 44px; font-size: 14px; }
.dr-invite-actions .mg-small { width: 100%; }
`;

export default function DoorClient() {
  const { call } = useHostApi();
  const [events, setEvents] = useState<DoorEvent[] | null>(null);
  const [invites, setInvites] = useState<DoorInvite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<{ id: string; text: string } | null>(null);
  const [answered, setAnswered] = useState<string | null>(null);
  const [leaveAsk, setLeaveAsk] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  // Set before any await, so a double tap sends one request (state alone updates a render too late).
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    const [r, i] = await Promise.all([call("GET", "/api/events/door/mine"), call("GET", "/api/events/door/invites")]);
    if (!r) return;
    if (r.status !== 200 || !r.body?.success || !Array.isArray(r.body.events)) { setError(errorCopy(r.status, r.body)); return; }
    setEvents((r.body.events as unknown[]).filter(isDoorEvent));
    // Invites are extra: if that call fails the scan list still shows.
    setInvites(i && i.status === 200 && Array.isArray(i.body?.invites)
      ? (i.body.invites as unknown[]).filter(isDoorInvite).filter((x) => x.status === "invited")
      : []);
  }, [call]);

  useEffect(() => { load(); }, [load]);

  async function answer(inv: DoorInvite, a: "accept" | "decline") {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(inv.id);
    setInviteError(null);
    setAnswered(null);
    const r = await call("POST", `/api/events/door/invites/${inv.id}/${a}`);
    busyRef.current = false;
    setBusy(null);
    if (!r) return;
    if (r.status !== 200 || !r.body?.success) {
      setInviteError({ id: inv.id, text: backendMessage(r.status, r.body) });
      if (r.status === 409 || r.status === 404) load();
      return;
    }
    setAnswered(inviteAnsweredCopy(a === "accept" ? "accepted" : "declined", inv));
    await load();
  }

  async function leave(e: DoorEvent) {
    if (busyRef.current || !e.inviteId) return;
    busyRef.current = true;
    setBusy(e.id);
    setLeaveError(null);
    const r = await call("POST", `/api/events/door/invites/${e.inviteId}/leave`);
    busyRef.current = false;
    setBusy(null);
    if (!r) return;
    // NOT_ON_TEAM: already off the team (removed meanwhile), so the row goes as well.
    if ((r.status === 200 && r.body?.success) || r.body?.code === "NOT_ON_TEAM") {
      setLeaveAsk(null);
      setAnswered("You left the door team.");
      await load();
      return;
    }
    setLeaveError(backendMessage(r.status, r.body));
  }

  return (
    <HostShell css={MANAGE_CSS + INVITE_CSS}>
      <header className="mg-head">
        <Link href="/events" className="ed-icon-btn" aria-label="Back to events">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <h1 className="mg-head-h">DOOR CHECK IN</h1>
      </header>
      <div className="mg-body">
        {events === null && !error && <div className="ed-muted" role="status">Loading your events…</div>}
        {error && (
          <div className="ed-err" role="alert">
            {error} <button type="button" className="ed-textbtn ed-inline-btn" onClick={load}>Try again</button>
          </div>
        )}

        {(invites.length > 0 || answered) && (
          <section className="mg-group" aria-label="Door team invites" data-testid="door-invites">
            <h2 className="mg-section">INVITES FOR YOU</h2>
            {invites.map((inv) => (
              <div key={inv.id} className="dr-invite" data-testid="door-invite">
                <p className="dr-invite-h">{inviteHeadline(inv)}</p>
                <p className="dr-invite-p">{inviteScopeLine(inv)}</p>
                {inviteError?.id === inv.id && <p className="ed-err" role="alert">{inviteError.text}</p>}
                <div className="dr-invite-actions">
                  <button type="button" className="ed-primary" disabled={busy !== null} onClick={() => answer(inv, "accept")}>{busy === inv.id ? "Saving…" : "Accept"}</button>
                  <button type="button" className="mg-small" disabled={busy !== null} onClick={() => answer(inv, "decline")}>Decline</button>
                </div>
              </div>
            ))}
            {answered && <p className="ed-ok" role="status">{answered}</p>}
          </section>
        )}

        {events !== null && events.length === 0 && (
          <div className="ed-card-msg">
            <h2 className="ed-h1">NOTHING TO SCAN</h2>
            <p className="ed-text">When you host an event, or accept a host&apos;s door team invite, the event shows up here until it ends.</p>
            <Link href="/events" className="ed-primary ed-auto">Browse events</Link>
          </div>
        )}
        {events !== null && events.length > 0 && (
          <section className="mg-group" aria-label="Events you can scan" data-testid="door-events">
            <h2 className="mg-section">EVENTS YOU CAN SCAN</h2>
            {events.map((e) => {
              const note = scanWindowNote(e);
              const asking = leaveAsk === e.id;
              return (
                <div key={e.id} className="ed-stack-sm" style={{ gap: 6 }}>
                  <Link href={`/events/${e.id}/scan`} className="mg-evrow" data-testid="door-row">
                    <div className="mg-evrow-main">
                      <div className="mg-evrow-title">{e.title}</div>
                      <div className="mg-sub">{whenRange(e.startsAt, e.endsAt, e.timezone)}</div>
                      <div className="mg-sub">{note ?? "Check in is open."}</div>
                    </div>
                    <div className="mg-evrow-side">{roleLabel(e.role)}</div>
                  </Link>
                  {canLeave(e) && !asking && (
                    <button type="button" className="ed-textbtn" style={{ alignSelf: "flex-end", minHeight: 36 }} disabled={busy !== null}
                      onClick={() => { setLeaveAsk(e.id); setLeaveError(null); }}>Leave team</button>
                  )}
                  {asking && (
                    <div className="mg-confirm" role="group" aria-label="Confirm leave">
                      <p>{leaveConfirmCopy(e)}</p>
                      {leaveError && <p className="ed-err" role="alert">{leaveError}</p>}
                      <div className="mg-confirm-actions">
                        <button type="button" className="mg-danger" disabled={busy !== null} onClick={() => leave(e)}>{busy === e.id ? "Leaving…" : "Yes, leave"}</button>
                        <button type="button" className="mg-small" disabled={busy !== null} onClick={() => { setLeaveAsk(null); setLeaveError(null); }}>Stay</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </div>
    </HostShell>
  );
}
