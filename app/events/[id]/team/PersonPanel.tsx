"use client";

/**
 * One person on the host's Event team page (mockup B, screens 46, 55): their times, their pay, a co-host's level,
 * asking them to stay longer, To be discussed amounts, and taking them off. The backend decides who may do what
 * (co-hosts: times only, never pay, stay longer, levels, the standing team or other co-hosts); this panel only hides
 * what the viewer can't use and shows the backend's message when something is refused.
 */

import { useRef, useState } from "react";
import { money } from "../../../e/_shared/format";
import { parsePriceCents } from "../../_host/editorLogic";
import { backendMessage, guestName } from "../../_host/manageLogic";
import {
  amountWaiting, isStayRequest, LINK_ROLES, payBody, payFormFrom, REMOVAL_REASONS, removeConfirm, removeQuery, roleName, needsReason, scheduleBody,
  STAY_CHOICES, STAY_LONGER_ROLES, stayBody, stayChoiceLabel, stayLine, stayPayChoices, stayStatus, timeFields, timeOf, zonedInputs,
  type PayForm, type RemovalReason, type StayPay, type StayRequest, type TeamRow, type TimeInputs,
} from "../../_host/teamLogic";

type Call = (method: string, path: string, body?: unknown) => Promise<{ status: number; body: any } | null>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Ev = { id: string; timezone: string; startsAt: string; endsAt: string; status: string };

export default function PersonPanel({ row, event, asHost, requests, call, now, onChanged, onRemoved, onClose }: {
  row: TeamRow; event: Ev; asHost: boolean; requests: StayRequest[]; call: Call; now: number;
  onChanged: () => void; onRemoved: (row: TeamRow, message: string) => void; onClose: () => void;
}) {
  const tz = event.timezone;
  const ended = new Date(event.endsAt).getTime() <= now || event.status === "cancelled";
  const who = guestName(row);
  const accepted = row.status === "accepted";
  const base = `/api/events/${event.id}/door/team/${row.userId}`;
  const roleQ = `?role=${encodeURIComponent(row.role)}`;

  /* times */
  const fields = timeFields(row.role);
  const [times, setTimes] = useState<TimeInputs>(() => ({
    startsAt: zonedInputs(row.schedule?.startsAt ?? null, tz), endsAt: zonedInputs(row.schedule?.endsAt ?? null, tz),
    callAt: zonedInputs(row.schedule?.callAt ?? null, tz), loadInAt: zonedInputs(row.schedule?.loadInAt ?? null, tz),
  }));
  const [place, setPlace] = useState(row.schedule?.placeNote ?? "");
  const [note, setNote] = useState(row.schedule?.hostNote ?? "");
  /* pay */
  const [pay, setPay] = useState<PayForm>(() => payFormFrom(row.pay));
  /* stay longer */
  const hourly = row.pay?.payType === "hourly";
  const [stayMin, setStayMin] = useState<number | null>(60);
  const [stayEnd, setStayEnd] = useState({ date: "", time: "" });
  const [stayPayPick, setStayPay] = useState<StayPay>(hourly ? "hourly" : "fixed");
  // Their pay type can change while the panel is open: never keep a choice the other set doesn't have (call 43).
  const stayPay: StayPay = hourly && stayPayPick === "fixed" ? "hourly" : !hourly && stayPayPick === "hourly" ? "fixed" : stayPayPick;
  const [stayFixed, setStayFixed] = useState("");
  /* amounts and removal */
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState(false);
  const [reason, setReason] = useState<RemovalReason | null>(null);
  const [reasonNote, setReasonNote] = useState("");

  const [busy, setBusy] = useState<string | null>(null);
  // Set before any await, so a double tap sends once (state updates a render too late).
  const busyRef = useRef(false);
  const [msg, setMsg] = useState<{ where: string; text: string; ok: boolean } | null>(null);

  async function send(where: string, method: string, path: string, body: unknown, ok: string, after?: (b: any) => void) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(where);
    setMsg(null);
    const r = await call(method, path, body);
    busyRef.current = false;
    setBusy(null);
    if (!r) return;
    if ((r.status === 200 || r.status === 201) && r.body?.success) {
      setMsg({ where, text: ok, ok: true });
      after?.(r.body);
      onChanged();
      return;
    }
    setMsg({ where, text: backendMessage(r.status, r.body), ok: false });
  }

  const say = (where: string) => msg?.where === where
    ? <p className={msg.ok ? "ed-ok" : "ed-err"} role={msg.ok ? "status" : "alert"}>{msg.text}</p> : null;

  function saveTimes() {
    const b = scheduleBody(times, place, note, tz);
    if (!b.ok) { setMsg({ where: "times", text: b.message, ok: false }); return; }
    send("times", "PUT", `${base}/schedule${roleQ}`, b.body, "Times saved.");
  }
  function savePay() {
    const b = payBody(row.role, pay);
    if (!b.ok) { setMsg({ where: "pay", text: b.message, ok: false }); return; }
    send("pay", "PUT", `${base}/pay${roleQ}`, b.body, accepted ? `Pay saved. ${who} gets a push.` : "Pay saved. They see it on the invite.");
  }
  function askStay() {
    const b = stayBody(stayMin, stayMin === null ? stayEnd : null, stayPay, stayFixed, tz);
    if (!b.ok) { setMsg({ where: "stay", text: b.message, ok: false }); return; }
    send("stay", "POST", `${base}/stay-longer${roleQ}`, b.body, `Sent. ${who} gets a push to accept or decline.`, (body) => {
      if (isStayRequest(body?.request)) setMsg({ where: "stay", text: `Sent. ${who} has until ${timeOf(body.request.expiresAt, tz)} to answer.`, ok: true });
    });
  }
  function saveAmount(r: StayRequest) {
    const c = parsePriceCents(amounts[r.id] ?? "");
    if (c === null || c > 100_000) { setMsg({ where: `amt:${r.id}`, text: "Enter an amount up to $1,000.", ok: false }); return; }
    send(`amt:${r.id}`, "PUT", `/api/events/${event.id}/team/stay-longer/${r.id}/amount`, { cents: c }, `Saved. ${who} gets ${money(c)} for staying.`);
  }
  async function remove() {
    const q = removeQuery(row, reason, reasonNote);
    if (!q.ok) { setMsg({ where: "remove", text: q.message, ok: false }); return; }
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy("remove");
    setMsg(null);
    const r = await call("DELETE", `${base}?${q.query}`);
    busyRef.current = false;
    setBusy(null);
    if (!r) return;
    if ((r.status === 200 && r.body?.success) || r.body?.code === "NOT_ON_TEAM") {
      onRemoved(row, row.status === "invited" ? `${who}'s invite was cancelled.` : `${who} is off the team.`);
      return;
    }
    setMsg({ where: "remove", text: backendMessage(r.status, r.body), ok: false });
  }

  const set = (k: keyof TimeInputs, part: "date" | "time", v: string) => setTimes((t) => ({ ...t, [k]: { ...t[k], [part]: v } }));
  // The backend lets co-hosts set this event's times for anyone but co-hosts, standing members included.
  const canTimes = !ended && row.role !== "cohost";
  const canPay = asHost && !ended && row.role !== "cohost";
  const canStay = asHost && accepted && !ended && STAY_LONGER_ROLES.includes(row.role) && new Date(event.startsAt).getTime() <= now;
  // The backend: the event's team locks at its end (standing spots can still go); co-hosts never touch the standing team or co-hosts.
  const canRemove = (row.scope === "standing" || !ended) && (asHost || (row.scope === "event" && row.role !== "cohost"));
  const mine = requests.filter((r) => r.role === row.role);
  // One open request per person, whatever the role (backend REQUEST_OPEN).
  const open = requests.some((r) => r.status === "open");

  return (
    <div className="tm-panel" data-testid="person-panel" role="region" aria-label={`${who}, ${roleName(row.role, row.roleLabel)}`}>
      <div className="tm-panel-head">
        <div>
          <div className="tm-panel-name">{who}</div>
          <div className="mg-sub">{roleName(row.role, row.roleLabel)}{row.scope === "standing" ? " · All your events" : ""}</div>
        </div>
        <button type="button" className="mg-small" onClick={onClose}>Close</button>
      </div>

      {row.role === "cohost" && asHost && accepted && (
        <section className="tm-block" aria-label="What they can do">
          <h3 className="mg-section">WHAT THEY CAN DO</h3>
          <div className="ed-seg" role="radiogroup" aria-label="Co-host level">
            {(["team", "edit"] as const).map((lv) => (
              <button key={lv} type="button" role="radio" aria-checked={row.cohostLevel === lv} className={row.cohostLevel === lv ? "on" : ""} disabled={busy !== null}
                onClick={() => send("level", "PUT", `${base}/cohost-level`, { scope: row.scope, level: lv }, "Saved.")}>{lv === "team" ? "Team" : "Team + edit"}</button>
            ))}
          </div>
          <div className="ed-hint">Team: see everything, scan, run the team. Team + edit: also change the event details and tickets.</div>
          {say("level")}
        </section>
      )}

      {canTimes && (
        <section className="tm-block" aria-label="Times" data-testid="panel-times">
          <h3 className="mg-section">TIMES</h3>
          {fields.map((f) => (
            <div key={f.key} className="tm-time">
              <label className="ed-label" htmlFor={`t-${f.key}`}>{f.label}</label>
              <div className="tm-time-in">
                <input id={`t-${f.key}`} className="ed-in" type="date" value={times[f.key].date} onChange={(e) => set(f.key, "date", e.target.value)} aria-label={`${f.label} date`} />
                <input className="ed-in" type="time" value={times[f.key].time} onChange={(e) => set(f.key, "time", e.target.value)} aria-label={`${f.label} time`} />
              </div>
            </div>
          ))}
          <label className="ed-label" htmlFor="t-place">Where to go</label>
          <input id="t-place" className="ed-in" value={place} maxLength={300} onChange={(e) => setPlace(e.target.value)} placeholder="Side door on 5th" />
          <label className="ed-label" htmlFor="t-note">Your note to them</label>
          <textarea id="t-note" className="ed-in" rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Wear all black." />
          <button type="button" className="ed-primary tm-btn" disabled={busy !== null} onClick={saveTimes}>{busy === "times" ? "Saving…" : "Save times"}</button>
          {say("times")}
        </section>
      )}

      {canPay && (
        <section className="tm-block" aria-label="Pay" data-testid="panel-pay">
          <h3 className="mg-section">PAY</h3>
          <div className="ed-seg" role="radiogroup" aria-label="Pay type">
            {(["none", "fixed", "hourly"] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={pay.payType === t} className={pay.payType === t ? "on" : ""} onClick={() => setPay((p) => ({ ...p, payType: t }))}>
                {t === "none" ? "No pay" : t === "fixed" ? "Fixed" : "Hourly"}
              </button>
            ))}
          </div>
          {pay.payType === "fixed" && <input className="ed-in" inputMode="decimal" aria-label="Fixed amount" placeholder="$160" value={pay.fixed} onChange={(e) => setPay((p) => ({ ...p, fixed: e.target.value }))} />}
          {pay.payType === "hourly" && <input className="ed-in" inputMode="decimal" aria-label="Hourly rate" placeholder="$50 an hour" value={pay.hourly} onChange={(e) => setPay((p) => ({ ...p, hourly: e.target.value }))} />}
          {pay.payType === "hourly" && <div className="ed-hint">Paid for the shift you set, start to end.</div>}
          {LINK_ROLES.includes(row.role) && (
            <>
              <label className="ed-label" htmlFor="p-com">Commission on their link sales (optional)</label>
              <input id="p-com" className="ed-in" inputMode="decimal" placeholder="10%" value={pay.commission} onChange={(e) => setPay((p) => ({ ...p, commission: e.target.value }))} />
            </>
          )}
          <div className="ed-hint">Paid 3 days after the event due to processing, once they set up payouts.</div>
          <button type="button" className="ed-primary tm-btn" disabled={busy !== null} onClick={savePay}>{busy === "pay" ? "Saving…" : "Save pay"}</button>
          {say("pay")}
        </section>
      )}

      {(canStay || mine.length > 0) && (
        <section className="tm-block" aria-label="Stay longer" data-testid="panel-stay">
          <h3 className="mg-section">STAY LONGER</h3>
          {mine.map((r) => (
            <div key={r.id} className="tm-req" data-testid="stay-request" data-status={r.status}>
              <div>{stayLine(r, tz, true)}</div>
              <div className="mg-sub">{stayStatus(r, tz)}</div>
              {asHost && amountWaiting(r) && (
                <div className="tm-amt">
                  <input className="ed-in" inputMode="decimal" aria-label="Amount for staying" placeholder="$ amount" value={amounts[r.id] ?? ""}
                    onChange={(e) => setAmounts((a) => ({ ...a, [r.id]: e.target.value }))} />
                  <button type="button" className="mg-small" disabled={busy !== null} onClick={() => saveAmount(r)}>Save</button>
                </div>
              )}
              {asHost && amountWaiting(r) && <div className="ed-hint">Enter it before payout day, 3 days after the event, or it&apos;s $0.</div>}
              {say(`amt:${r.id}`)}
            </div>
          ))}
          {canStay && !open && (
            <>
              <div className="ed-seg tm-wrap" role="radiogroup" aria-label="How much longer">
                {STAY_CHOICES.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={stayMin === m} className={stayMin === m ? "on" : ""} onClick={() => setStayMin(m)}>{stayChoiceLabel(m)}</button>
                ))}
                <button type="button" role="radio" aria-checked={stayMin === null} className={stayMin === null ? "on" : ""} onClick={() => setStayMin(null)}>Pick end time</button>
              </div>
              {stayMin === null && (
                <div className="tm-time-in">
                  <input className="ed-in" type="date" aria-label="End date" value={stayEnd.date} onChange={(e) => setStayEnd((s) => ({ ...s, date: e.target.value }))} />
                  <input className="ed-in" type="time" aria-label="End time" value={stayEnd.time} onChange={(e) => setStayEnd((s) => ({ ...s, time: e.target.value }))} />
                </div>
              )}
              <div className="ed-seg tm-wrap" role="radiogroup" aria-label="Extra pay">
                {stayPayChoices(hourly).map((c) => (
                  <button key={c.key} type="button" role="radio" aria-checked={stayPay === c.key} className={stayPay === c.key ? "on" : ""} onClick={() => setStayPay(c.key)}>{c.label}</button>
                ))}
              </div>
              {stayPay === "fixed" && <input className="ed-in" inputMode="decimal" aria-label="Extra amount" placeholder="$50" value={stayFixed} onChange={(e) => setStayFixed(e.target.value)} />}
              <button type="button" className="ed-primary tm-btn" disabled={busy !== null} onClick={askStay}>{busy === "stay" ? "Sending…" : `Ask ${who} to stay`}</button>
              <div className="ed-hint">They have until their end time to answer, and at least 30 minutes.</div>
            </>
          )}
          {say("stay")}
        </section>
      )}

      {canRemove && (
        <section className="tm-block" aria-label="Take off the team">
          {!removing && (
            <button type="button" className="mg-small tm-danger" onClick={() => { setRemoving(true); setMsg(null); }}>{row.status === "invited" ? "Cancel invite" : "Take off the team"}</button>
          )}
          {removing && (
            <div className="mg-confirm" role="group" aria-label="Confirm">
              <p>{removeConfirm(row)}</p>
              {row.status === "accepted" && (
                <>
                  <div className="ed-seg tm-wrap" role="radiogroup" aria-label="Why">
                    {REMOVAL_REASONS.map((x) => (
                      <button key={x.key} type="button" role="radio" aria-checked={reason === x.key} className={reason === x.key ? "on" : ""} onClick={() => setReason(reason === x.key ? null : x.key)}>{x.label}</button>
                    ))}
                  </div>
                  {reason === "other" && <input className="ed-in" maxLength={200} aria-label="Why" placeholder="Say why in a few words" value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} />}
                  <div className="ed-hint">{needsReason(row) ? "They had pay, so they see the reason you pick." : "Optional. If you pick one, they see it."}</div>
                </>
              )}
              {say("remove")}
              <div className="mg-confirm-actions">
                <button type="button" className="mg-danger" disabled={busy !== null} onClick={remove}>{busy === "remove" ? "Saving…" : row.status === "invited" ? "Yes, cancel invite" : "Yes, take them off"}</button>
                <button type="button" className="mg-small" disabled={busy !== null} onClick={() => { setRemoving(false); setMsg(null); }}>Keep</button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
