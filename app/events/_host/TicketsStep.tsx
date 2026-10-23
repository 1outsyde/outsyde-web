"use client";

import { activeTypes, profilePayoutNote, refundChangeAllowed, ticketRowLines, type EventForm, type HostEvent, type HostTicketType } from "./editorLogic";

export type PayoutBanner =
  | { kind: "none" }
  | { kind: "setup"; canStart: boolean; sending: boolean; error: string | null };

export interface TicketsStepProps {
  event: HostEvent;
  types: HostTicketType[];
  form: EventForm;
  setForm: (f: EventForm) => void;
  payout: PayoutBanner;
  onStartPayouts: () => void;
  onAdd: () => void;
  onEdit: (t: HostTicketType) => void;
  onRemove: (t: HostTicketType) => void;
  removingId: string | null;
}

export default function TicketsStep({ event, types, form, setForm, payout, onStartPayouts, onAdd, onEdit, onRemove, removingId }: TicketsStepProps) {
  const list = activeTypes(types);
  const published = event.status !== "draft";
  const saved = { policy: event.refundPolicy, cutoffHours: event.refundCutoffHours };
  // After publish the refund policy can only become more flexible: "No refunds" is off once refunds were offered.
  const noRefundsLocked = published && !refundChangeAllowed(saved, { policy: "no_refunds", cutoffHours: null });
  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) => setForm({ ...form, [k]: v });

  return (
    <div className="ed-stack">
      {payout.kind === "setup" && (
        <div className="ed-banner" role="status">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8B930" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ed-banner-icon"><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20" /></svg>
          <div className="ed-stack-sm">
            <div>To sell paid tickets, add where we send your earnings. You get paid 3 days after the event.</div>
            {payout.canStart ? (
              <button type="button" className="ed-pill" onClick={onStartPayouts} disabled={payout.sending}>
                {payout.sending ? "Opening Stripe" : "Set up payouts"}
              </button>
            ) : (
              <div className="ed-hint">{profilePayoutNote(event.hostType)}</div>
            )}
            {payout.error && <div className="ed-err" role="alert">{payout.error}</div>}
          </div>
        </div>
      )}

      {list.length > 0 && (
        <ul className="ed-types" aria-label="Ticket types">
          {list.map((t) => {
            const l = ticketRowLines(t, list, event.timezone);
            return (
              <li key={t.id} className="ed-type">
                <div className="ed-type-main">
                  <div className="ed-strong">{t.name}</div>
                  <div className="ed-hint">{l.qty}</div>
                  <div className="ed-gold-sm">{l.when}</div>
                </div>
                <div className="ed-type-side">
                  <div className="ed-strong">{l.price}</div>
                  <div className="ed-type-actions">
                    <button type="button" className="ed-textbtn" onClick={() => onEdit(t)} aria-label={`Edit ${t.name}`}>Edit</button>
                    <button type="button" className="ed-textbtn" onClick={() => onRemove(t)} disabled={removingId === t.id} aria-label={`Remove ${t.name}`}>
                      {removingId === t.id ? "Removing" : "Remove"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" className="ed-dashed" onClick={onAdd}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Add a ticket type
      </button>

      <div className="ed-field">
        <label htmlFor="cap" className="ed-label">EVENT CAPACITY (OPTIONAL)</label>
        <input id="cap" className="ed-in" inputMode="numeric" placeholder="No limit" value={form.capacity}
          onChange={(e) => set("capacity", e.target.value)} />
      </div>

      <div className="ed-box" role="radiogroup" aria-labelledby="refunds-title">
        <div className="ed-box-title" id="refunds-title">Refunds</div>
        <label className="ed-radio">
          <span className="ed-inline">
            Until
            <input aria-label="Hours before the event" className="ed-in ed-hours" inputMode="numeric"
              value={form.refundCutoffHours}
              onChange={(e) => setForm({ ...form, refundPolicy: "until_cutoff", refundCutoffHours: e.target.value })} />
            hours before
          </span>
          <input type="radio" name="refunds" checked={form.refundPolicy === "until_cutoff"}
            onChange={() => set("refundPolicy", "until_cutoff")} />
        </label>
        <label className="ed-radio">
          <span>No refunds</span>
          <input type="radio" name="refunds" checked={form.refundPolicy === "no_refunds"} disabled={noRefundsLocked}
            onChange={() => set("refundPolicy", "no_refunds")} />
        </label>
        <div className="ed-hint ed-box-pad">After you publish, you can make this more flexible but not stricter.</div>
      </div>
    </div>
  );
}
