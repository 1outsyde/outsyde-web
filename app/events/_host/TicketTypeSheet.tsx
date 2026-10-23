"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "../../e/_shared/format";
import { hostEarningsCents } from "./hostFees";
import { parsePriceCents, switchPaid, ticketBody, type HostTicketType, type SalesStart, type TicketSheet } from "./editorLogic";

export interface TicketTypeSheetProps {
  initial: TicketSheet;
  /** The type being edited, or null when adding one. */
  editing: HostTicketType | null;
  /** Other active types of this event (for "when another type runs out"). */
  others: HostTicketType[];
  timezone: string;
  /** Saves the body; resolves to an error message, or null when saved. */
  onSave: (body: Record<string, unknown>) => Promise<string | null>;
  onClose: () => void;
}

export default function TicketTypeSheet({ initial, editing, others, timezone, onSave, onClose }: TicketTypeSheetProps) {
  const [s, setS] = useState<TicketSheet>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const priceLocked = !!editing && editing.takenCount > 0;
  const set = <K extends keyof TicketSheet>(k: K, v: TicketSheet[K]) => setS((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("input:not([disabled]), button:not([disabled])")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cents = s.paid ? parsePriceCents(s.price) : null;
  const earn = cents != null && cents >= 100 ? hostEarningsCents(cents) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const r = ticketBody(s, timezone);
    if (!r.ok) { setError(r.message); return; }
    setSaving(true);
    setError(null);
    const msg = await onSave(r.body);
    setSaving(false);
    if (msg) setError(msg);
  }

  const starts: { value: SalesStart; label: string }[] = [
    { value: "now", label: "Right away" },
    { value: "date", label: "On a date I pick" },
  ];
  if (others.length) starts.push({ value: "after", label: "When another ticket type runs out" });

  return (
    <div className="ed-sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ed-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={panel}>
        <div className="ed-sheet-grip" aria-hidden="true" />
        <div className="ed-sheet-head">
          <h2 id="sheet-title" className="ed-sheet-title">{editing ? "Edit ticket type" : "New ticket type"}</h2>
          <button type="button" className="ed-icon-btn" aria-label="Close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="ed-stack" noValidate>
          <div className="ed-seg" role="radiogroup" aria-label="Ticket price type">
            <button type="button" role="radio" aria-checked={!s.paid} className={!s.paid ? "on" : ""} disabled={priceLocked}
              onClick={() => setS((p) => switchPaid(p, false))}>Free</button>
            <button type="button" role="radio" aria-checked={s.paid} className={s.paid ? "on" : ""} disabled={priceLocked}
              onClick={() => setS((p) => switchPaid(p, true))}>Paid</button>
          </div>

          <div className="ed-field">
            <label htmlFor="t-name" className="ed-label">NAME</label>
            <input id="t-name" className="ed-in" maxLength={80} placeholder={s.paid ? "General admission" : "Free RSVP"}
              value={s.name} onChange={(e) => set("name", e.target.value)} />
          </div>

          <div className="ed-grid2">
            {s.paid && (
              <div className="ed-field">
                <label htmlFor="t-price" className="ed-label">PRICE</label>
                <input id="t-price" className="ed-in" inputMode="decimal" placeholder="$0.00" disabled={priceLocked}
                  value={s.price} onChange={(e) => set("price", e.target.value)} />
              </div>
            )}
            <div className="ed-field">
              <label htmlFor="t-qty" className="ed-label">HOW MANY</label>
              <input id="t-qty" className="ed-in" inputMode="numeric" placeholder="100"
                value={s.quantity} onChange={(e) => set("quantity", e.target.value)} />
            </div>
            <div className="ed-field">
              <label htmlFor="t-max" className="ed-label">MAX PER ORDER</label>
              <input id="t-max" className="ed-in" inputMode="numeric"
                value={s.maxPerOrder} onChange={(e) => set("maxPerOrder", e.target.value)} />
            </div>
            <div className="ed-field">
              <label htmlFor="t-limit" className="ed-label">LIMIT PER PERSON</label>
              <input id="t-limit" className="ed-in" inputMode="numeric" placeholder="No limit"
                value={s.perAccountLimit} onChange={(e) => set("perAccountLimit", e.target.value)} />
            </div>
          </div>
          {priceLocked && <div className="ed-hint">The price can&apos;t change once tickets are taken.</div>}

          {s.paid && (
            <div className="ed-hint">
              Guests pay a service fee on top of your price.{earn != null ? ` You earn ${money(earn)} per ticket.` : ""}
            </div>
          )}

          <div className="ed-box" role="radiogroup" aria-labelledby="sales-start">
            <div className="ed-box-title" id="sales-start">Sales start</div>
            {starts.map((o) => (
              <label key={o.value} className="ed-radio">
                <span>{o.label}</span>
                <input type="radio" name="sales-start" value={o.value} checked={s.salesStart === o.value}
                  onChange={() => set("salesStart", o.value)} />
              </label>
            ))}
            {s.salesStart === "date" && (
              <div className="ed-grid2 ed-box-pad">
                <div className="ed-field">
                  <label htmlFor="t-sdate" className="ed-sublabel">Date</label>
                  <input id="t-sdate" type="date" className="ed-in" value={s.salesDate} onChange={(e) => set("salesDate", e.target.value)} />
                </div>
                <div className="ed-field">
                  <label htmlFor="t-stime" className="ed-sublabel">Time</label>
                  <input id="t-stime" type="time" className="ed-in" value={s.salesTime} onChange={(e) => set("salesTime", e.target.value)} />
                </div>
              </div>
            )}
            {s.salesStart === "after" && (
              <div className="ed-field ed-box-pad">
                <label htmlFor="t-after" className="ed-sublabel">Opens when this runs out</label>
                <select id="t-after" className="ed-in" value={s.unlockAfterId} onChange={(e) => set("unlockAfterId", e.target.value)}>
                  <option value="">Pick a ticket type</option>
                  {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {error && <p className="ed-err" role="alert">{error}</p>}
          <button type="submit" className="ed-primary" disabled={saving}>
            {saving ? "Saving" : editing ? "Save ticket" : "Add ticket"}
          </button>
        </form>
      </div>
    </div>
  );
}
