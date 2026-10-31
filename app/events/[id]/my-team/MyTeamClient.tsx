"use client";

/**
 * My page for an event I'm on the team for (p4-team step 8, mockup C, screens 50 to 53 and 56): my roles with their
 * times, where to go and the host's notes, notes from the host, a request to stay longer (Accept / Decline), my
 * promoter link, what I'll get (exactly what's paid: the backend works out every amount), payout setup, and after the
 * payout, Got it / Not yet. Only my own things (GET /team/me answers 404 for anyone not on the team).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HostShell, useHostApi } from "../../_host/hostApi";
import { MANAGE_CSS } from "../../_host/manageStyles";
import { whenRange } from "../../_host/editorLogic";
import { backendMessage } from "../../_host/manageLogic";
import { errorCopy, fmt, GENERIC_ERROR } from "../../../e/_shared/format";
import {
  acceptedEndLine, canAnswerPaid, dollars, durationText, earningLines, isRolePay, isStayRequest, isTeamEvent, isTeamPayout, leaveSpotCopy, myPayoutLine, roleName, stayLine,
  timeFields, timeOf, type RolePay, type Schedule, type StayRequest, type TeamEvent, type TeamPayout,
} from "../../_host/teamLogic";
import { TEAM_CSS } from "../../_host/teamStyles";

type Role = { role: string; roleLabel: string | null; roleInfo?: { name: string; description: string }; scope: "standing" | "event"; schedule: Schedule | null; pay: RolePay | null };
type Me = {
  event: { id: string; slug: string; title: string; startsAt: string; endsAt: string; timezone: string };
  host: { name: string }; roles: Role[];
  promoter: { code: string; url: string; rsvps: number; ticketsSold: number; salesCents: number } | null;
  payTotalCents: number | null; payout: TeamPayout | null; payoutSetup: { needed: boolean; deadline: string | null } | null;
  fromHost: { id: string; at: string; text: string; from: { name?: string } }[]; stayLonger: StayRequest[];
};

export default function MyTeamClient({ eventId }: { eventId: string }) {
  const { call } = useHostApi();
  const [me, setMe] = useState<Me | null>(null);
  const [spots, setSpots] = useState<TeamEvent["team"]>([]);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ where: string; ok: boolean; text: string } | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  // Leaving the last spot makes /team/me answer 404: keep the confirmation on that screen.
  const [left, setLeft] = useState(false);
  // Read when the data loads, never during render.
  const [now, setNow] = useState(0);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    const [r, mine] = await Promise.all([call("GET", `/api/events/${eventId}/team/me`), call("GET", "/api/events/door/mine?roles=all")]);
    if (!r) return;
    if (r.status === 404) { setState("notfound"); return; }
    if (r.status !== 200 || !r.body?.success || !r.body.event) { setLoadError(errorCopy(r.status, r.body)); setState("error"); return; }
    const b = r.body;
    setNow(Date.now());
    setMe({
      event: b.event, host: b.host ?? { name: "The host" },
      roles: Array.isArray(b.roles) ? b.roles.map((x: Role) => ({ ...x, pay: isRolePay(x.pay) ? x.pay : null })) : [],
      promoter: b.promoter ?? null, payTotalCents: typeof b.payTotalCents === "number" ? b.payTotalCents : null,
      payout: isTeamPayout(b.payout) ? b.payout : null, payoutSetup: b.payoutSetup ?? null,
      fromHost: Array.isArray(b.fromHost) ? b.fromHost : [], stayLonger: Array.isArray(b.stayLonger) ? b.stayLonger.filter(isStayRequest) : [],
    });
    const ev = mine && mine.status === 200 && Array.isArray(mine.body?.events) ? (mine.body.events as unknown[]).filter(isTeamEvent).find((e) => e.id === eventId) : undefined;
    setSpots(ev?.team ?? []);
    setState("ready");
  }, [call, eventId]);

  useEffect(() => { load(); }, [load]);

  async function act(where: string, path: string, ok: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(where);
    setNote(null);
    const r = await call("POST", path);
    busyRef.current = false;
    setBusy(null);
    if (!r) return;
    if (r.status === 200 && r.body?.success) { if (where.startsWith("leave:")) setLeft(true); setNote({ where, ok: true, text: ok }); setLeaving(null); await load(); return; }
    setNote({ where, ok: false, text: backendMessage(r.status, r.body) });
    if (r.status === 409 || r.status === 404) await load();
  }

  const say = (where: string) => note?.where === where ? <p className={note.ok ? "ed-ok" : "ed-err"} role={note.ok ? "status" : "alert"}>{note.text}</p> : null;
  const page = (inner: React.ReactNode) => <HostShell css={MANAGE_CSS + TEAM_CSS}>{inner}</HostShell>;
  const back = (
    <Link href="/events/door" className="ed-icon-btn" aria-label="Back to Event team">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
    </Link>
  );

  if (state === "loading") return page(<div className="ed-muted" role="status">Loading…</div>);
  if (state === "notfound" || !me) {
    return page(
      <div className="ed-card-msg" role="alert" data-testid="not-found">
        <h1 className="ed-h1">{state === "error" ? "EVENT TEAM" : left ? "YOU LEFT" : "NOT ON THIS TEAM"}</h1>
        <p className="ed-text">{state === "error" ? loadError ?? GENERIC_ERROR : left ? "You're no longer on the Event team for this event." : "You're not on the Event team for this event, or it was removed."}</p>
        <Link href="/events/door" className="ed-primary ed-auto">Event team</Link>
      </div>,
    );
  }

  const tz = me.event.timezone;
  const ended = new Date(me.event.endsAt).getTime() <= now;
  const open = me.stayLonger.filter((r) => r.status === "open" && new Date(r.expiresAt).getTime() >= now);
  const lines = me.roles.flatMap((r) => (r.pay ? earningLines(r.pay).map((l) => ({ ...l, label: me.roles.length > 1 ? `${roleName(r.role, r.roleLabel)}: ${l.label}` : l.label })) : []));

  return page(
    <>
      <header className="ed-top">
        {back}
        <div className="ed-top-title">
          <h1 className="ed-top-h" style={{ overflowWrap: "anywhere" }}>{me.event.title}</h1>
          <div className="ed-hint">{whenRange(me.event.startsAt, me.event.endsAt, tz)} · {me.host.name}</div>
        </div>
        <div className="ed-icon-spacer" />
      </header>

      <div className="mg-body" data-testid="my-team">
        {open.map((r) => (
          <section key={r.id} className="tm-req" aria-label="Request to stay longer" data-testid="stay-ask">
            <b>{me.host.name} asked you to stay {durationText(r.extraMinutes)}</b>
            <div>{stayLine(r, tz)}</div>
            <div className="mg-sub">Answer by {timeOf(r.expiresAt, tz)}.</div>
            <div className="dr-row2">
              <button type="button" className="ed-primary tm-btn" disabled={busy !== null} onClick={() => act(`stay:${r.id}`, `/api/events/${eventId}/team/me/stay-longer/${r.id}/accept`, "Accepted. Your end time and pay are updated.")}>
                {busy === `stay:${r.id}` ? "Saving…" : "Accept"}
              </button>
              <button type="button" className="mg-small" disabled={busy !== null} onClick={() => act(`stay:${r.id}`, `/api/events/${eventId}/team/me/stay-longer/${r.id}/decline`, "Declined. Nothing changes.")}>Decline</button>
            </div>
            {say(`stay:${r.id}`)}
          </section>
        ))}
        {open.length === 0 && note?.where.startsWith("stay:") && say(note.where)}

        {me.roles.map((r) => {
          const s = r.schedule;
          const until = acceptedEndLine(me.stayLonger, r.role, tz);
          return (
            <section key={r.role} className="tm-tot" aria-label={roleName(r.role, r.roleLabel)} data-testid="my-role">
              <span className="mg-chip">{roleName(r.role, r.roleLabel).toUpperCase()}</span>
              {timeFields(r.role).filter((f) => s?.[f.key]).map((f) => (
                <div key={f.key} className="mg-trow"><span>{f.label}</span><b>{timeOf(s![f.key] as string, tz)}</b></div>
              ))}
              {until && <div className="mg-gold" style={{ fontWeight: 600, fontSize: 14 }} data-testid="stay-until">{until}</div>}
              {s?.placeNote && <div className="mg-trow"><span>Where to go</span><b style={{ overflowWrap: "anywhere" }}>{s.placeNote}</b></div>}
              {s?.hostNote && <div className="tm-msg"><div className="mg-sub">From the host</div><div className="tm-msg-text">{s.hostNote}</div></div>}
              {r.role === "door" && !ended && <Link href={`/events/${eventId}/scan`} className="ed-primary tm-btn" style={{ textAlign: "center" }}>Open the scanner</Link>}
              {r.role === "cohost" && <Link href={`/events/${eventId}/manage`} className="mg-small" style={{ alignSelf: "flex-start" }}>Manage the event</Link>}
            </section>
          );
        })}

        {me.promoter && (
          <section className="tm-tot" aria-label="Your link" data-testid="my-link">
            <h2 className="mg-section">YOUR LINK</h2>
            <div className="tm-msg-text" style={{ wordBreak: "break-all" }}>{me.promoter.url}</div>
            <button type="button" className="mg-small" style={{ alignSelf: "flex-start" }} onClick={() => { try { navigator.clipboard?.writeText(me.promoter!.url); setNote({ where: "link", ok: true, text: "Link copied." }); } catch { /* ignore */ } }}>Copy link</button>
            {say("link")}
            <div className="mg-trow"><span>Tickets sold through your link</span><b>{me.promoter.ticketsSold}</b></div>
            {me.promoter.rsvps > 0 && <div className="mg-trow"><span>RSVPs through your link</span><b>{me.promoter.rsvps}</b></div>}
            <div className="mg-trow"><span>Ticket price total</span><b>{dollars(me.promoter.salesCents)}</b></div>
          </section>
        )}

        {me.fromHost.length > 0 && (
          <section className="ed-stack-sm" aria-label="From the host" data-testid="from-host">
            <h2 className="mg-section">FROM THE HOST</h2>
            {me.fromHost.map((m) => (
              <div key={m.id} className="tm-msg">
                <div className="mg-sub">{m.from?.name ?? me.host.name} · {fmt(m.at, tz, { weekday: "short", hour: "numeric", minute: "2-digit" })}</div>
                <div className="tm-msg-text">{m.text}</div>
              </div>
            ))}
          </section>
        )}

        {(lines.length > 0 || me.payout) && (
          <section className="tm-tot" aria-label="You'll get" data-testid="my-pay">
            <h2 className="mg-section">{me.payout ? "YOUR PAY" : "YOU'LL GET"}</h2>
            {!me.payout && lines.map((l, i) => <div key={i} className="mg-trow"><span>{l.label}</span><b>{l.value}</b></div>)}
            {me.payout
              ? <div className="mg-trow"><span>Total</span><b>{dollars(me.payout.amountCents)}</b></div>
              : me.payTotalCents !== null && <div className="mg-trow" style={{ borderTop: "1px solid #2A2A2A", paddingTop: 6 }}><span>Total</span><b>{dollars(me.payTotalCents)}</b></div>}
            {me.payout ? <div className="mg-sub">{myPayoutLine(me.payout)}</div> : <div className="ed-hint">Paid 3 days after the event due to processing.</div>}
            {me.payout && canAnswerPaid(me.payout) && (
              <div className="dr-row2">
                <button type="button" className="ed-primary tm-btn" disabled={busy !== null} onClick={() => act("paid", `/api/events/${eventId}/team/me/payout/got-it`, "Thanks. The host sees you got it.")}>Got it</button>
                <button type="button" className="mg-small" disabled={busy !== null} onClick={() => act("paid", `/api/events/${eventId}/team/me/payout/not-yet`, "The host sees you haven't got it yet.")}>Not yet</button>
              </div>
            )}
            {say("paid")}
            {me.payoutSetup?.needed && (
              <p className="ed-err" style={{ margin: 0 }} data-testid="setup-needed">
                Set up payouts{me.payoutSetup.deadline ? ` by ${fmt(me.payoutSetup.deadline, tz, { weekday: "short", month: "short", day: "numeric" })}` : ""} to get paid. <Link href="/events/payouts" className="ed-link">Set up</Link>
              </p>
            )}
          </section>
        )}

        {spots.length > 0 && !ended && (
          <section className="ed-stack-sm" aria-label="Leave">
            {spots.map((sp) => (
              <div key={sp.inviteId} className="ed-stack-sm" style={{ gap: 6 }}>
                {leaving !== sp.inviteId && (
                  <button type="button" className="ed-textbtn" style={{ alignSelf: "flex-end", minHeight: 36 }} disabled={busy !== null} onClick={() => { setLeaving(sp.inviteId); setNote(null); }}>
                    Leave as {roleName(sp.role, sp.roleLabel)}{sp.scope === "standing" ? " (all their events)" : ""}
                  </button>
                )}
                {leaving === sp.inviteId && (
                  <div className="mg-confirm" role="group" aria-label="Confirm leave">
                    <p>{leaveSpotCopy(sp, me.event.title)}</p>
                    {say(`leave:${sp.inviteId}`)}
                    <div className="mg-confirm-actions">
                      <button type="button" className="mg-danger" disabled={busy !== null} onClick={() => act(`leave:${sp.inviteId}`, `/api/events/door/invites/${sp.inviteId}/leave?roles=all`, "You left.")}>
                        {busy === `leave:${sp.inviteId}` ? "Leaving…" : "Yes, leave"}
                      </button>
                      <button type="button" className="mg-small" disabled={busy !== null} onClick={() => setLeaving(null)}>Stay</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </>,
  );
}

