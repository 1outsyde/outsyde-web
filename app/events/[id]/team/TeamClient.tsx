"use client";

/**
 * Event team (p4-team step 8, mockup A, screens 45 to 49): the host's and co-hosts' page for this event's team.
 *   Invite: username, a role (Admissions, Security, Promoter, Entertainment, Media, Co-host, Other with a name), and
 *   All my events or Only this event. Co-hosts invite for this event only, never co-hosts (the backend refuses).
 *   The team by role (GET /door/team?roles=all), each row opens PersonPanel (times, pay, stay longer, take off).
 *   Team pay and what the host takes home (all or nothing), messages to the team, and once the payout is worked out,
 *   who Outsyde paid and who the host pays (I paid them).
 * GET /door/team answers 404 for anyone but the host and accepted co-hosts.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HostShell, useHostApi } from "../../_host/hostApi";
import { MANAGE_CSS } from "../../_host/manageStyles";
import { backendMessage, guestName } from "../../_host/manageLogic";
import { errorCopy, fmt, GENERIC_ERROR } from "../../../e/_shared/format";
import { cleanUsername, usernameMax } from "../../_host/doorLogic";
import {
  audienceLine, dollars, inviteSentLine, isStayRequest, isTeamPayout, messageBody, payoutStatusLine, roleLabelError, roleName, rowLine, rowStatus, sections, teamRows,
  TEAM_ROLES, type Audience, type StayRequest, type TeamPayout, type TeamRole, type TeamRow,
} from "../../_host/teamLogic";
import PersonPanel from "./PersonPanel";
import { TEAM_CSS } from "../../_host/teamStyles";


type Screen = "loading" | "ready" | "notfound" | "error";
type Ev = { id: string; title: string; timezone: string; startsAt: string; endsAt: string; status: string };
type Totals = { teamCents: number; hostEarningsCents: number; covered: boolean; teamPaidCents: number; hostTakeHomeCents: number } | null;
type Sent = { id: string; sentAt: string; text: string; audience: string; role: string | null; to: { userId: string; username: string | null } | null; from: { name?: string }; recipientCount: number };

export default function TeamClient({ eventId }: { eventId: string }) {
  const { call } = useHostApi();
  const [screen, setScreen] = useState<Screen>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [event, setEvent] = useState<Ev | null>(null);
  const [asHost, setAsHost] = useState(false);
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [totals, setTotals] = useState<Totals>(null);
  const [requests, setRequests] = useState<StayRequest[]>([]);
  const [payouts, setPayouts] = useState<(TeamPayout & { member: { userId: string; firstName: string | null; username: string | null } })[]>([]);
  const [sent, setSent] = useState<Sent[]>([]);
  const [open, setOpen] = useState<string | null>(null); // "userId:role:scope"
  const [notice, setNotice] = useState<string | null>(null);
  // Read when the data loads, never during render.
  const [now, setNow] = useState(0);

  // invite form
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<TeamRole>("door");
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"standing" | "event">("event");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const sendingRef = useRef(false);

  // messages
  const [aud, setAud] = useState<string>("team");
  const [text, setText] = useState("");
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgNote, setMsgNote] = useState<{ ok: boolean; text: string } | null>(null);

  // payouts
  const [payBusy, setPayBusy] = useState<string | null>(null);
  const [payErr, setPayErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const t = await call("GET", `/api/events/${eventId}/door/team?roles=all`);
    if (!t) return false;
    if (t.status === 404) { setScreen("notfound"); return false; }
    if (t.status !== 200 || !t.body?.success) { setLoadError(errorCopy(t.status, t.body)); setScreen("error"); return false; }
    setNow(Date.now());
    setRows(teamRows(t.body));
    setTotals(t.body.payTotals && typeof t.body.payTotals.teamCents === "number" ? t.body.payTotals : null);
    // Extras: a failure leaves them empty, the team still shows.
    const [s, m, p] = await Promise.all([
      call("GET", `/api/events/${eventId}/team/stay-longer`),
      call("GET", `/api/events/${eventId}/team/messages`),
      call("GET", `/api/events/${eventId}/team-payouts`),
    ]);
    setRequests(s && s.status === 200 && Array.isArray(s.body?.requests) ? (s.body.requests as unknown[]).filter(isStayRequest) : []);
    setSent(m && m.status === 200 && Array.isArray(m.body?.messages) ? m.body.messages : []);
    setPayouts(p && p.status === 200 && Array.isArray(p.body?.payouts) ? (p.body.payouts as unknown[]).filter((x) => isTeamPayout(x) && !!(x as TeamPayout).member) as never[] : []);
    return true;
  }, [call, eventId]);

  const load = useCallback(async () => {
    setScreen("loading");
    setLoadError(null);
    if (!(await refresh())) return;
    const m = await call("GET", `/api/events/${eventId}/manage`);
    const e = m && m.status === 200 ? m.body?.event : null;
    if (e && typeof e.title === "string") {
      setEvent({ id: eventId, title: e.title, timezone: e.timezone, startsAt: e.startsAt, endsAt: e.endsAt, status: e.status });
      setAsHost(m?.body?.access?.as !== "cohost");
    }
    setScreen("ready");
  }, [call, eventId, refresh]);

  useEffect(() => { load(); }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const name = cleanUsername(username);
    if (!name || sendingRef.current) return;
    if (role === "other") { const le = roleLabelError(label); if (le) { setAddError(le); return; } }
    sendingRef.current = true;
    setAdding(true);
    setAddError(null);
    setNotice(null);
    const body: Record<string, unknown> = { username: name, scope: asHost ? scope : "event", role };
    if (role === "other") body.roleLabel = label.trim().replace(/\s+/g, " ");
    const r = await call("POST", `/api/events/${eventId}/door/team`, body);
    sendingRef.current = false;
    setAdding(false);
    if (!r) return;
    if (r.status !== 201 || !r.body?.success) { setAddError(backendMessage(r.status, r.body)); return; }
    const m = r.body.member ?? {};
    setNotice(inviteSentLine(guestName({ firstName: m.firstName ?? null, username: m.username ?? name }), role, role === "other" ? label.trim() : null));
    setUsername("");
    setLabel("");
    await refresh();
  }

  async function sendMessage() {
    const a: Audience = aud === "team" ? { to: "team" } : aud.startsWith("role:") ? { to: "role", role: aud.slice(5) as TeamRole } : { to: "person", userId: aud.slice(7) };
    const b = messageBody(a, text);
    if (!b.ok) { setMsgNote({ ok: false, text: b.message }); return; }
    if (msgBusy) return;
    setMsgBusy(true);
    setMsgNote(null);
    const r = await call("POST", `/api/events/${eventId}/team/messages`, b.body);
    setMsgBusy(false);
    if (!r) return;
    if ((r.status === 200 || r.status === 201) && r.body?.success) {
      setText("");
      setMsgNote({ ok: true, text: "Sent. They get a push and see it on their event page." });
      await refresh();
      return;
    }
    setMsgNote({ ok: false, text: backendMessage(r.status, r.body) });
  }

  async function markPaid(userId: string, undo: boolean) {
    if (payBusy) return;
    setPayBusy(userId);
    setPayErr(null);
    const r = await call(undo ? "DELETE" : "POST", `/api/events/${eventId}/team-payouts/${userId}/paid`);
    setPayBusy(null);
    if (!r) return;
    if (r.status === 200 && r.body?.success) { await refresh(); return; }
    setPayErr(backendMessage(r.status, r.body));
  }

  const page = (inner: React.ReactNode) => <HostShell css={MANAGE_CSS + TEAM_CSS}>{inner}</HostShell>;

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
        <h1 className="ed-h1">EVENT TEAM</h1>
        <p className="ed-text">{loadError ?? GENERIC_ERROR}</p>
        <div className="ed-row-actions">
          <button type="button" className="ed-primary ed-auto" onClick={load}>Try again</button>
          <Link href={`/events/${eventId}/manage`} className="ed-link">Back to the event</Link>
        </div>
      </div>,
    );
  }

  const tz = event?.timezone ?? "America/New_York";
  const ended = event ? new Date(event.endsAt).getTime() <= now || event.status === "cancelled" : false;
  const roleChoices = TEAM_ROLES.filter((r) => asHost || r !== "cohost");
  const accepted = rows.filter((r) => r.status === "accepted");
  const people = Array.from(new Map(accepted.map((r) => [r.userId, r])).values());
  const rolesOnTeam = Array.from(new Set(accepted.map((r) => r.role)));
  const keyOf = (r: TeamRow) => `${r.userId}:${r.role}:${r.scope}`;

  return page(
    <>
      <header className="ed-top">
        <Link href={`/events/${eventId}/manage`} className="ed-icon-btn" aria-label="Back to the event">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <div className="ed-top-title">
          <h1 className="ed-top-h">Event team</h1>
          {event && <div className="ed-hint" style={{ overflowWrap: "anywhere" }}>{event.title}</div>}
        </div>
        <div className="ed-icon-spacer" />
      </header>

      <div className="mg-body">
        {!ended && (
          <form className="ed-stack-sm" onSubmit={invite} data-testid="team-add">
            <label htmlFor="team-user" className="ed-label">INVITE SOMEONE</label>
            <input id="team-user" className="ed-in" value={username} placeholder="@username" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              maxLength={usernameMax(username)} onChange={(e) => { setUsername(e.target.value.slice(0, usernameMax(e.target.value))); setAddError(null); }} />
            <div className="ed-box" style={{ padding: 12, gap: 10 }}>
              <div className="tm-chips" role="radiogroup" aria-label="Role">
                {roleChoices.map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={role === r} className={role === r ? "on" : ""} onClick={() => { setRole(r); setAddError(null); }}>{roleName(r)}</button>
                ))}
              </div>
              {role === "other" && <input className="ed-in" aria-label="Name of the role" placeholder="Coat check" maxLength={40} value={label} onChange={(e) => { setLabel(e.target.value); setAddError(null); }} />}
              {asHost && (
                <div className="ed-seg" role="radiogroup" aria-label="Access">
                  <button type="button" role="radio" aria-checked={scope === "standing"} className={scope === "standing" ? "on" : ""} onClick={() => setScope("standing")}>All my events</button>
                  <button type="button" role="radio" aria-checked={scope === "event"} className={scope === "event" ? "on" : ""} onClick={() => setScope("event")}>Only this event</button>
                </div>
              )}
              <div className="ed-hint">{role === "cohost" ? "Co-hosts see everything you see for the event." : `${roleName(role, role === "other" ? label : null)}: you set their times and pay after you invite them.`}</div>
              <button type="submit" className="ed-primary tm-btn" disabled={adding || !cleanUsername(username)}>{adding ? "Sending…" : "Send invite"}</button>
            </div>
            {addError && <p className="ed-err" role="alert" data-testid="add-error">{addError}</p>}
          </form>
        )}
        {notice && <p className="ed-ok" role="status">{notice}</p>}

        {rows.length === 0 && <div className="mg-sub" data-testid="team-empty">No one on the team yet. Invite someone above.</div>}
        {sections(rows).map((sec) => (
          <section key={sec.key} className="ed-stack-sm" style={{ gap: 6 }} aria-label={sec.title} data-testid="team-section">
            <h2 className="mg-section">{sec.title}</h2>
            {sec.rows.map((r) => {
              const k = keyOf(r);
              const st = rowStatus(r);
              return (
                <div key={k} className="ed-stack-sm" style={{ gap: 6 }}>
                  <button type="button" className="tm-row" aria-expanded={open === k} onClick={() => setOpen(open === k ? null : k)} data-testid="team-row" data-status={r.status} data-scope={r.scope}>
                    <div style={{ minWidth: 0 }}>
                      <div className="tm-row-name">{guestName(r)}</div>
                      <div className="mg-sub">{rowLine(r, tz)}</div>
                    </div>
                    <div className={`tm-st ${r.status === "accepted" ? "ok" : r.status === "invited" ? "wait" : "no"}`}>{st}</div>
                  </button>
                  {open === k && event && (
                    <PersonPanel row={r} event={event} asHost={asHost} requests={requests.filter((q) => q.memberUserId === r.userId)} call={call} now={now}
                      onChanged={() => { refresh(); }} onClose={() => setOpen(null)}
                      onRemoved={(_row, m) => { setOpen(null); setNotice(m); refresh(); }} />
                  )}
                </div>
              );
            })}
          </section>
        ))}

        {totals && totals.teamCents > 0 && payouts.length === 0 && (
          <section className="tm-tot" aria-label="Team pay" data-testid="team-totals">
            <div className="mg-trow"><span>Team pay</span><b>{dollars(totals.teamCents)}</b></div>
            <div className="mg-trow"><span>Your ticket earnings</span><b>{dollars(totals.hostEarningsCents)}</b></div>
            <div className={totals.covered ? "ed-ok" : "ed-err"} style={{ margin: 0 }}>
              {totals.covered
                ? `Covered. You take home ${dollars(totals.hostTakeHomeCents)}.`
                : "Not covered: the team is owed more than you earned, so Outsyde pays the team $0 and you keep your earnings. You pay them yourself."}
            </div>
            <div className="ed-hint">Paid 3 days after the event due to processing.</div>
          </section>
        )}

        {payouts.length > 0 && (
          <section className="ed-stack-sm" style={{ gap: 6 }} aria-label="Team pay" data-testid="team-payouts">
            <h2 className="mg-section">TEAM PAY</h2>
            {payouts.map((p) => (
              <div key={p.member.userId} className="tm-row" style={{ cursor: "default", flexWrap: "wrap" }} data-testid="payout-row">
                <div style={{ minWidth: 0 }}>
                  <div className="tm-row-name">{guestName(p.member)} · {dollars(p.amountCents)}</div>
                  <div className="mg-sub">{payoutStatusLine(p)}</div>
                </div>
                {asHost && p.status === "host_to_pay" && !p.confirmedAt && (
                  <button type="button" className="mg-small" disabled={payBusy !== null} onClick={() => markPaid(p.member.userId, !!p.hostPaidAt)}>
                    {payBusy === p.member.userId ? "Saving…" : p.hostPaidAt ? "Undo" : "I paid them"}
                  </button>
                )}
              </div>
            ))}
            {payErr && <p className="ed-err" role="alert">{payErr}</p>}
          </section>
        )}

        {people.length > 0 && (
          <section className="ed-stack-sm" aria-label="Message the team" data-testid="team-messages">
            <h2 className="mg-section">MESSAGE THE TEAM</h2>
            <select className="ed-in" aria-label="Send to" value={aud} onChange={(e) => setAud(e.target.value)}>
              <option value="team">Whole team</option>
              {rolesOnTeam.map((r) => <option key={r} value={`role:${r}`}>All {roleName(r)}</option>)}
              {people.map((p) => <option key={p.userId} value={`person:${p.userId}`}>{guestName(p)}</option>)}
            </select>
            <textarea className="ed-in" rows={3} maxLength={1000} aria-label="Message" placeholder="Radio check at 9:15." value={text} onChange={(e) => { setText(e.target.value); setMsgNote(null); }} />
            <button type="button" className="ed-primary tm-btn" disabled={msgBusy || !text.trim()} onClick={sendMessage}>{msgBusy ? "Sending…" : "Send"}</button>
            {msgNote && <p className={msgNote.ok ? "ed-ok" : "ed-err"} role={msgNote.ok ? "status" : "alert"}>{msgNote.text}</p>}
            {sent.map((m) => (
              <div key={m.id} className="tm-msg" data-testid="sent-message">
                <div className="mg-sub">{audienceLine(m)} · {fmt(m.sentAt, tz, { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>
                <div className="tm-msg-text">{m.text}</div>
              </div>
            ))}
          </section>
        )}
      </div>
    </>,
  );
}
