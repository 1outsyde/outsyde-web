"use client";

/**
 * Door team (mockups 17 and 38). Host only: GET /door/team answers 404 for anyone else. Two lists: the standing team
 * (all the host's events) and this event only. Invite by username with a scope (backend 075: they scan once they
 * accept). Rows: on the team (Remove), invited (Cancel invite), said no (Invite again). Remove and cancel confirm first.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HostShell, useHostApi } from "../../_host/hostApi";
import { MANAGE_CSS } from "../../_host/manageStyles";
import { backendMessage, guestName } from "../../_host/manageLogic";
import { errorCopy, GENERIC_ERROR } from "../../../e/_shared/format";
import {
  cancelInviteCopy, cleanUsername, inviteSentCopy, isTeamMember, memberAction, memberStatus, memberStatusLine, removeConfirmCopy,
  usernameMax, type Scope, type TeamMember,
} from "../../_host/doorLogic";

type Screen = "loading" | "ready" | "notfound" | "error";

export default function TeamClient({ eventId }: { eventId: string }) {
  const { call } = useHostApi();
  const [screen, setScreen] = useState<Screen>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [standing, setStanding] = useState<TeamMember[]>([]);
  const [eventOnly, setEventOnly] = useState<TeamMember[]>([]);

  const [username, setUsername] = useState("");
  const [scope, setScope] = useState<Scope>("event");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<{ userId: string; scope: Scope } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setScreen("loading");
    setLoadError(null);
    const t = await call("GET", `/api/events/${eventId}/door/team`);
    if (!t) return;
    if (t.status === 404) { setScreen("notfound"); return; }
    if (t.status !== 200 || !t.body?.success) {
      setLoadError(errorCopy(t.status, t.body));
      setScreen("error");
      return;
    }
    setStanding(Array.isArray(t.body.standing) ? (t.body.standing as unknown[]).filter(isTeamMember) : []);
    setEventOnly(Array.isArray(t.body.event) ? (t.body.event as unknown[]).filter(isTeamMember) : []);
    setScreen("ready");
    // Only the host gets this far (door/team is host only), so /manage is asked just for the title.
    const m = await call("GET", `/api/events/${eventId}/manage`);
    setTitle(m && m.status === 200 && typeof m.body?.event?.title === "string" ? m.body.event.title : null);
  }, [call, eventId]);

  useEffect(() => { load(); }, [load]);

  /** POST an invite; an "invite again" replaces the declined row (same person) instead of adding one. */
  async function sendInvite(name: string, s: Scope): Promise<string | null> {
    const r = await call("POST", `/api/events/${eventId}/door/team`, { username: name, scope: s });
    if (!r) return null;
    if (r.status !== 201 || !r.body?.success || !isTeamMember(r.body.member)) return backendMessage(r.status, r.body);
    const m = r.body.member as TeamMember;
    const upsert = (l: TeamMember[]) => (l.some((x) => x.userId === m.userId) ? l.map((x) => (x.userId === m.userId ? m : x)) : [...l, m]);
    if (s === "standing") setStanding(upsert);
    else setEventOnly(upsert);
    setNotice(inviteSentCopy(m));
    return null;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = cleanUsername(username);
    if (!name || adding) return;
    setAdding(true);
    setAddError(null);
    setNotice(null);
    const err = await sendInvite(name, scope);
    setAdding(false);
    if (err) { setAddError(err); return; }
    setUsername("");
  }

  async function inviteAgain(m: TeamMember, s: Scope) {
    if (adding || !m.username) return;
    setAdding(true);
    setRemoveError(null);
    setNotice(null);
    const err = await sendInvite(m.username, s);
    setAdding(false);
    if (err) setRemoveError(err);
  }

  async function remove(m: TeamMember, s: Scope) {
    if (removing) return;
    setRemoving(true);
    setRemoveError(null);
    const r = await call("DELETE", `/api/events/${eventId}/door/team/${m.userId}?scope=${s}`);
    setRemoving(false);
    if (!r) return;
    // NOT_ON_TEAM means they're already gone: drop them from the list as well.
    if ((r.status === 200 && r.body?.success) || r.body?.code === "NOT_ON_TEAM") {
      if (s === "standing") setStanding((l) => l.filter((x) => x.userId !== m.userId));
      else setEventOnly((l) => l.filter((x) => x.userId !== m.userId));
      setConfirm(null);
      setNotice(memberStatus(m) === "invited" ? `${guestName(m)}'s invite was cancelled.` : `${guestName(m)} was removed from the door team.`);
      return;
    }
    setRemoveError(backendMessage(r.status, r.body));
  }

  const page = (inner: React.ReactNode) => <HostShell css={MANAGE_CSS}>{inner}</HostShell>;

  if (screen === "loading") return page(<div className="ed-muted" role="status">Loading…</div>);

  if (screen === "notfound") {
    return page(
      <div className="ed-card-msg" role="alert" data-testid="not-found">
        <h1 className="ed-h1">EVENT NOT FOUND</h1>
        <p className="ed-text">Event not found. It may have been removed, or it belongs to another account.</p>
        <Link href="/events/mine" className="ed-primary ed-auto">Your events</Link>
      </div>,
    );
  }

  if (screen === "error") {
    return page(
      <div className="ed-card-msg" role="alert">
        <h1 className="ed-h1">DOOR TEAM</h1>
        <p className="ed-text">{loadError ?? GENERIC_ERROR}</p>
        <div className="ed-row-actions">
          <button type="button" className="ed-primary ed-auto" onClick={load}>Try again</button>
          <Link href={`/events/${eventId}/manage`} className="ed-link">Back to the event</Link>
        </div>
      </div>,
    );
  }

  const list = (members: TeamMember[], s: Scope, empty: string, label: string) => (
    <section className="ed-stack-sm" style={{ gap: 4 }} aria-label={label} data-testid={`team-${s}`}>
      <h2 className="mg-section">{label}</h2>
      {members.length === 0 && <div className="mg-sub" style={{ padding: "8px 0" }}>{empty}</div>}
      <ul className="mg-list">
        {members.map((m) => {
          const open = confirm?.userId === m.userId && confirm.scope === s;
          const action = memberAction(m);
          const cancelling = action === "Cancel invite";
          return (
            <li key={m.userId} className="mg-li" style={open ? { flexWrap: "wrap" } : undefined} data-testid="team-row" data-status={memberStatus(m)}>
              <div className="mg-li-main">
                <div className="mg-li-name">{guestName(m)}</div>
                <div className="mg-li-sub" style={memberStatus(m) === "invited" ? { color: "#E8B930" } : undefined}>{memberStatusLine(m, s)}</div>
              </div>
              {!open && action === "Invite again" && (
                <button type="button" className="mg-small" disabled={adding || !m.username} onClick={() => inviteAgain(m, s)}>Invite again</button>
              )}
              {!open && action !== "Invite again" && (
                <button type="button" className="mg-small" disabled={removing} onClick={() => { setConfirm({ userId: m.userId, scope: s }); setRemoveError(null); }}>{action}</button>
              )}
              {open && (
                <div className="mg-confirm" style={{ flexBasis: "100%" }} role="group" aria-label={cancelling ? "Confirm cancel invite" : "Confirm remove"}>
                  <p>{cancelling ? cancelInviteCopy(m) : removeConfirmCopy(m, s)}</p>
                  {removeError && <p className="ed-err" role="alert">{removeError}</p>}
                  <div className="mg-confirm-actions">
                    <button type="button" className="mg-danger" disabled={removing} onClick={() => remove(m, s)}>
                      {removing ? (cancelling ? "Cancelling…" : "Removing…") : (cancelling ? "Yes, cancel invite" : "Yes, remove")}
                    </button>
                    <button type="button" className="mg-small" disabled={removing} onClick={() => { setConfirm(null); setRemoveError(null); }}>{cancelling ? "Keep invite" : "Keep"}</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );

  return page(
    <>
      <header className="ed-top">
        <Link href={`/events/${eventId}/manage`} className="ed-icon-btn" aria-label="Back to the event">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <div className="ed-top-title">
          <h1 className="ed-top-h">Door team</h1>
          {title && <div className="ed-hint" style={{ overflowWrap: "anywhere" }}>{title}</div>}
        </div>
        <div className="ed-icon-spacer" />
      </header>

      <div className="mg-body">
        <p className="ed-sublabel" style={{ margin: 0, color: "#CFC7B8", lineHeight: 1.45 }}>
          People you invite can scan tickets and see the guest list once they accept. They can&apos;t see sales, earnings or edit the event.
        </p>

        <form className="ed-stack-sm" onSubmit={add} data-testid="team-add">
          <label htmlFor="team-user" className="ed-label">INVITE SOMEONE</label>
          <input id="team-user" className="ed-in" value={username} placeholder="@username" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            maxLength={usernameMax(username)} onChange={(e) => { setUsername(e.target.value.slice(0, usernameMax(e.target.value))); setAddError(null); }} />
          <div className="ed-box" style={{ padding: 12, gap: 10 }}>
            <div className="ed-seg" role="radiogroup" aria-label="Access">
              <button type="button" role="radio" aria-checked={scope === "standing"} className={scope === "standing" ? "on" : ""} onClick={() => setScope("standing")}>All my events</button>
              <button type="button" role="radio" aria-checked={scope === "event"} className={scope === "event" ? "on" : ""} onClick={() => setScope("event")}>Only this event</button>
            </div>
            <div className="ed-hint">
              {scope === "standing" ? "Once they accept, they can scan every event you host until you remove them." : "Once they accept, they can scan this event until it ends."}
            </div>
            <button type="submit" className="ed-primary" style={{ minHeight: 44, fontSize: 14 }} disabled={adding || !cleanUsername(username)}>
              {adding ? "Sending…" : "Send invite"}
            </button>
          </div>
          {addError && <p className="ed-err" role="alert" data-testid="add-error">{addError}</p>}
        </form>
        {notice && <p className="ed-ok" role="status">{notice}</p>}

        {removeError && !confirm && <p className="ed-err" role="alert">{removeError}</p>}
        {list(standing, "standing", "No one yet. Invite someone with All my events to have them at every event.", "YOUR TEAM, ALL EVENTS")}
        {list(eventOnly, "event", "No one invited just for this event.", "ONLY THIS EVENT")}
      </div>
    </>,
  );
}
